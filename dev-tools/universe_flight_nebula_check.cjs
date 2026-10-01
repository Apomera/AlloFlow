const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = process.env.UNIVERSE_REPO || path.resolve(__dirname, '..');
const report = process.env.UNIVERSE_NEBULA_REPORT || path.join(repo, 'reports/universe-flight-2026-09-29');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const sourceFile = path.join(repo, 'stem_lab/universe_flight_scene.js');
const uiFile = path.join(repo, 'stem_lab/stem_tool_universe.js');
const baselineFile = process.env.UNIVERSE_NEBULA_BASELINE || path.join(report, 'nebula-baseline-renderer.js');
const baselineUIFile = process.env.UNIVERSE_NEBULA_BASELINE_UI || path.join(report, 'nebula-baseline-ui.js');
const previewURL = process.env.UNIVERSE_NEBULA_URL || 'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?nebula=qa';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const normalizedSourceHash = bytes => hash(bytes.toString('utf8').replace(/\r\n/g, '\n'));
const result = { sourceHash: hash(fs.readFileSync(sourceFile)), uiHash: hash(fs.readFileSync(uiFile)), completed: false, checks: [], captures: [], comparisons: [], errors: [], graphics: [], accessibility: [], layouts: [], progressSamples: [] };
fs.mkdirSync(report, { recursive: true });
const save = () => fs.writeFileSync(path.join(report, 'nebula-check.json'), JSON.stringify(result, null, 2));

// Inspect actual rendered pixels, without introducing another image dependency.
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

const fixedCloudViews = [
  { name: 'cloud-wide', position: [0,0,0], aim: [9,-2,34], fov: 60 },
  { name: 'cloud-front', position: [13,-7,24], aim: [9,-2,34], fov: 50 },
  { name: 'cloud-side', position: [21,4,38], aim: [9,-2,34], fov: 60 }
];
async function setView(page, view, region = 'neighborhood') {
  await page.evaluate(({view,region}) => {
    const scene = window.__nebulaScene, saved = scene.snapshot(), delta = view.aim.map((value,i) => value-view.position[i]);
    Object.assign(saved.settings,{region,mode:'explore',fov:view.fov,quality:'auto',exposure:1});
    Object.assign(saved.state,{position:view.position,yaw:Math.atan2(delta[0],delta[2]),pitch:Math.atan2(delta[1],Math.hypot(delta[0],delta[2])),distanceLy:0,universeYears:0,travelerYears:0});
    saved.targetId=null; if(!scene.restore(saved))throw new Error('Cloud pose rejected: '+view.name); scene.set({running:false});
  },{view,region});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function pointDigest(page) {
  return page.evaluate(async () => {
    const data=window.__nebulaGL.at(-1).record.currentPoints;
    if(!data)throw new Error('No actual uploaded point bytes');
    const digest=await crypto.subtle.digest('SHA-256',data);
    return {count:data.byteLength/36,hash:Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('')};
  });
}
async function localCloudSummary(page) {
  return page.evaluate(async()=>{
    const data=window.__nebulaGL.at(-1).record.currentPoints;
    if(!data||data.byteLength!==19203*36)throw new Error('Unexpected neighborhood point upload');
    const floats=new Float32Array(data.buffer,data.byteOffset,data.byteLength/4),masked=data.slice(),lights=[],profiles=[];
    for(let index=8500;index<9500;index++){
      if(floats[index*9+8]<=.5)throw new Error('The local emission-region point range changed');
      lights.push(floats[index*9+7]);profiles.push(floats[index*9+8]);masked.fill(0,index*36+28,index*36+36);
    }
    const digest=await crypto.subtle.digest('SHA-256',masked);
    return {maskedHash:Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join(''),lights,profiles};
  });
}
async function regionDigests(page) {
  const regions={};
  for(const region of ['neighborhood','galaxy','cosmic']) {
    await setView(page,{name:region+'-points',position:region==='cosmic'?[0,0,-2200000]:region==='galaxy'?[0,0,-95000]:[0,0,0],aim:[0,0,0],fov:65},region);
    regions[region]=await pointDigest(page);
    if(region==='neighborhood')regions[region].localClouds=await localCloudSummary(page);
  }
  return regions;
}
async function mathSamples(page) {
  return page.evaluate(() => ({gamma:UniverseFlight.math.gamma(.99),aberrate:UniverseFlight.math.aberrate([.4,-.2,.7],.99),spectrum:UniverseFlight.math.viewSpectrum(.99,.3,-.2,550),clock:UniverseFlight.math.lightClock(.99,1)}));
}
async function atlasDigests(page) {
  return page.evaluate(async()=>Promise.all(window.__nebulaGL[0].record.atlasUploads.map(async item=>{
    const preserved=item.bytes.slice();if(item.width===512&&item.height===128)for(let i=0;i<preserved.length;i+=4)preserved[i]=0;
    const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
    return {width:item.width,height:item.height,hash:await digest(item.bytes),preservedHash:await digest(preserved)};
  })));
}
function projectCloudDetailShaders(shaders) {
  const changes=[
    ['  float cloudDetail = step(5.0, a_cloud) * smoothstep(12.0, 30.0, gl_PointSize / u_dpr);\n  v_stellarDetail = vec3(resolved, mix(seed, cloudDetail, isCloud), 2.0 / gl_PointSize);','  v_stellarDetail = vec3(resolved, seed, 2.0 / gl_PointSize);'],
    ['  v_cloudProfile = vec3(mod(max(0.0, floor(a_cloud) - 1.0), 4.0), cos(rotation), sin(rotation));','  v_cloudProfile = vec3(max(0.0, floor(a_cloud) - 1.0), cos(rotation), sin(rotation));'],
    ['    vec4 emission = texture2D(u_cloudTexture, uv / vec2(512.0, 128.0));\n    cloud = mix(emission.a, emission.r, v_stellarDetail.y) * 0.55;','    cloud = texture2D(u_cloudTexture, uv / vec2(512.0, 128.0)).a * 0.55;']
  ];
  const fragment=shaders.find(shader=>shader.includes('uniform sampler2D u_cloudTexture;'));
  assert.ok(fragment,'The existing cloud fragment shader is present');
  assert.equal((fragment.match(/texture2D\(u_cloudTexture,/g)||[]).length,1,'Resolved clouds retain a single atlas sample');
  let projected=shaders.slice();
  for(const [accepted,previous] of changes){
    assert.equal(projected.reduce((count,shader)=>count+shader.split(accepted).length-1,0),1,'Each accepted cloud shader change occurs exactly once');
    projected=projected.map(shader=>shader.replace(accepted,previous));
  }
  return projected;
}
async function baselineCapture(browser) {
  assert.equal(normalizedSourceHash(fs.readFileSync(baselineFile)),'faebfb6da6ef23b37946bee76f0e4f2e0a67e463a4b6a21dc94ccff3f013d760');
  assert.equal(normalizedSourceHash(fs.readFileSync(baselineUIFile)),'3ef2151d3d027d5bd92ead5839512f46b682a115a10959bb2f389502a4fccc15');
  const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});
  let rendererIntercepts=0,uiIntercepts=0;
  await page.route(/\/stem_lab\/universe_flight_scene\.js(?:\?.*)?$/,async route=>{rendererIntercepts++;await route.fulfill({contentType:'application/javascript',body:fs.readFileSync(baselineFile)});});
  await page.route(/\/stem_lab\/stem_tool_universe\.js(?:\?.*)?$/,async route=>{uiIntercepts++;await route.fulfill({contentType:'application/javascript',body:fs.readFileSync(baselineUIFile)});});
  await page.addInitScript(() => {
    window.__nebulaGL=[]; const context=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      const gl=context.call(this,type,...args);if(type!=='webgl'||!gl||gl.__nebulaProbe)return gl;gl.__nebulaProbe=true;
      const record={shaders:[],currentPoints:null,atlasUploads:[]};window.__nebulaGL.push({gl,record});const data=gl.bufferData.bind(gl),shader=gl.shaderSource.bind(gl),image=gl.texImage2D.bind(gl);
      gl.bufferData=function(target,values,...rest){if(values instanceof Float32Array&&values.length>9000&&values.length%9===0)record.currentPoints=new Uint8Array(values.buffer,values.byteOffset,values.byteLength).slice();return data(target,values,...rest);};
      gl.shaderSource=function(object,text){record.shaders.push(text);return shader(object,text);};
      gl.texImage2D=function(...args){const bytes=args[8];if(args.length===9&&bytes instanceof Uint8Array)record.atlasUploads.push({width:args[3],height:args[4],bytes:bytes.slice()});return image(...args);};return gl;
    };
    let api;Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){const create=value.create;value.create=function(canvas,options){const status=options.onStatus;const scene=create.call(this,canvas,Object.assign({},options,{onStatus(info){window.__nebulaStatus=info;if(status)status(info);}}));window.__nebulaScene=scene;return scene;};api=value;}});
  });
  page.on('pageerror',error=>result.errors.push('Baseline: '+String(error)));
  try {
    await page.goto(previewURL);await page.waitForFunction(()=>window.__nebulaScene&&window.__nebulaStatus?.state==='ready');assert.ok(rendererIntercepts&&uiIntercepts);
    await page.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
    const captures=[];
    for(const view of fixedCloudViews){
      await setView(page,view);const actual=await page.evaluate(()=>window.__nebulaScene.capture()),buffer=Buffer.from(actual.dataUrl.split(',')[1],'base64'),image=png(buffer);
      fs.writeFileSync(path.join(report,'nebula-baseline-'+view.name+'.png'),buffer);captures.push({name:view.name,width:image.width,height:image.height,pixelHash:hash(image.pixels),stats:statistics(image),snapshot:actual.snapshot});console.log('Captured nebula-baseline-'+view.name+'.png');
    }
    const regions=await regionDigests(page),shaderHash=hash(JSON.stringify(await page.evaluate(()=>window.__nebulaGL[0].record.shaders))),math=await mathSamples(page),halo=await page.evaluate(()=>UniverseFlight.flybys().find(item=>item.id==='halo')),atlases=await atlasDigests(page);
    assert.deepEqual(await page.evaluate(()=>window.__nebulaGL.map(({gl})=>gl.getError())),[0]);
    return {sourceHash:hash(fs.readFileSync(baselineFile)),uiHash:hash(fs.readFileSync(baselineUIFile)),captures,regions,shaderHash,math,halo,atlases};
  } finally {await page.close();}
}
async function compareFixedCloudViews(page) {
  await page.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
  for(const view of fixedCloudViews){
    await setView(page,view);const actual=await page.evaluate(()=>window.__nebulaScene.capture()),buffer=Buffer.from(actual.dataUrl.split(',')[1],'base64'),image=png(buffer),baseline=png(fs.readFileSync(path.join(report,'nebula-baseline-'+view.name+'.png')));
    const before=statistics(baseline),after=statistics(image),changed=difference(baseline,image);
    assert.ok(changed.changedFraction>0&&after.mean>before.mean,'The brighter resolved local emission is visible at the exact '+view.name+' pose');assert.ok(after.clippedWhiteFraction<.05);
    fs.writeFileSync(path.join(report,'nebula-refined-'+view.name+'.png'),buffer);result.comparisons.push({name:view.name,pixelHash:hash(image.pixels),before,after,difference:changed,snapshot:actual.snapshot});
    assert.deepEqual(await page.evaluate(()=>window.__nebulaGL.map(({gl})=>gl.getError())),[0]);save();
  }
  await page.locator('.uf-stage').getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
}
async function verifyRendererInvariants(page,baseline) {
  result.regions=await regionDigests(page);assert.deepEqual(result.regions.galaxy,baseline.regions.galaxy);assert.deepEqual(result.regions.cosmic,baseline.regions.cosmic);
  const previous=baseline.regions.neighborhood,current=result.regions.neighborhood;
  assert.equal(current.count,previous.count);assert.equal(current.localClouds.maskedHash,previous.localClouds.maskedHash);assert.equal(current.localClouds.lights.length,1000);assert.equal(previous.localClouds.lights.length,1000);assert.equal(current.localClouds.profiles.length,1000);assert.equal(previous.localClouds.profiles.length,1000);
  const gain=2.4/1.35;
  for(let index=0;index<1000;index++){
    const light=current.localClouds.lights[index],old=previous.localClouds.lights[index];assert.ok(light>old);assert.ok(Math.abs(light-old*gain)<=Math.max(1e-8,light*2e-7),'Only the intended local cloud light gain changes at point '+index);
    assert.ok(Math.abs(current.localClouds.profiles[index]-previous.localClouds.profiles[index]-4)<1e-6,'Only the +4 resolved cloud profile flag changes within Float32 rounding at point '+index);
  }
  result.localCloudChange={count:1000,lightGain:gain,profileOffset:4,profileTolerance:1e-6,allOtherNeighborhoodBytesUnchanged:true};
  const shaders=await page.evaluate(()=>window.__nebulaGL[0].record.shaders);
  result.shaderHash=hash(JSON.stringify(shaders));result.projectedShaderHash=hash(JSON.stringify(projectCloudDetailShaders(shaders)));assert.equal(result.projectedShaderHash,baseline.shaderHash);
  result.math=await mathSamples(page);assert.deepEqual(result.math,baseline.math);
  result.atlases=await atlasDigests(page);assert.equal(result.atlases.length,baseline.atlases.length);
  for(let index=0;index<result.atlases.length;index++){
    const atlas=result.atlases[index],old=baseline.atlases[index];assert.equal(atlas.width,old.width);assert.equal(atlas.height,old.height);assert.equal(atlas.preservedHash,old.preservedHash);
    if(atlas.width===512&&atlas.height===128)assert.notEqual(atlas.hash,old.hash,'Only the cloud atlas red channel adds resolved emission');else assert.equal(atlas.hash,old.hash,'The galaxy atlas stays byte-identical');
  }
  const halo=await page.evaluate(()=>{const {highlights,...preserved}=UniverseFlight.flybys().find(item=>item.id==='halo');return preserved;});
  assert.deepEqual(halo,baseline.halo);save();
}

(async () => {
  save();
  const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    result.baseline = await baselineCapture(browser);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('response', async response => {
      if (/\/stem_lab\/(universe_flight_scene|stem_tool_universe)\.js(?:\?|$)/.test(response.url())) {
        try { const entry = { url: response.url(), status: response.status(), hash: hash(await response.body()) }; result.served = result.served || []; result.served.push(entry); }
        catch (error) { result.errors.push('Cannot read served runtime: ' + error); }
      }
    });
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
          const launch = scene.startFlyby;
          if (launch) scene.startFlyby = function (...args) { const entry = { args, before: scene.snapshot() }; entry.accepted = launch.apply(this, args); entry.after = scene.snapshot(); window.__nebulaLaunches.push(entry); return entry.accepted; };
          window.__nebulaScene = scene; window.__nebulaCanvas = canvas; window.__nebulaScenes.push(scene); return scene;
        }; api = value;
      } });
    });
    await page.goto(previewURL);
    await page.waitForFunction(() => window.__nebulaScene && window.__nebulaStatus?.state === 'ready');
    await page.addScriptTag({ path: path.join(repo, 'node_modules/axe-core/axe.min.js') });
    const stage = page.locator('.uf-stage'), canvas = stage.locator('canvas'), panel = stage.locator('#uf-inview-controls');
    const next = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const snapshot = () => page.evaluate(() => window.__nebulaScene.snapshot());
    const info = () => page.evaluate(() => window.__nebulaInfo);
    const check = text => { result.checks.push(text); save(); };
    async function enter() { await page.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await page.waitForFunction(() => !!document.fullscreenElement); }
    async function exit() { if (await page.evaluate(() => !!document.fullscreenElement)) { await stage.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await page.waitForFunction(() => !document.fullscreenElement); } }
    async function open(section = 'explore') { if (!await panel.count()) await stage.locator('#uf-flight-controls-toggle').click(); await panel.locator('#uf-inview-tab-' + section).click(); await panel.locator('#uf-inview-panel-' + section).waitFor({ state: 'visible' }); await next(); }
    async function close() { if (await panel.count()) await panel.getByRole('button', { name: 'Close flight controls', exact: true }).click(); await page.waitForFunction(() => !document.querySelector('#uf-inview-controls')); }
    async function focusedCanvas() { await page.waitForFunction(() => document.activeElement === window.__nebulaCanvas); }
    async function pause() { if ((await info()).running) { await canvas.focus(); await canvas.press('Space'); } await page.waitForFunction(() => window.__nebulaInfo?.running === false); await next(); return snapshot(); }
    async function play() { await canvas.focus(); await canvas.press('Space'); await page.waitForFunction(() => window.__nebulaInfo?.running === true); }
    async function axeScope(name, node = stage) { const violations = await node.evaluate(async node => { const result = await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); return result.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })); }); result.accessibility.push({ name, violations }); assert.deepEqual(violations, [], name + ' passes scoped accessibility'); save(); }
    async function capture(name) {
      const actual = await page.evaluate(() => window.__nebulaScene.capture()); assert.ok(actual?.dataUrl.startsWith('data:image/png;base64,'));
      const buffer = Buffer.from(actual.dataUrl.split(',')[1], 'base64'), image = png(buffer), stats = statistics(image); assert.ok(stats.max > 32);
      assert.ok(stats.clippedWhiteFraction<.05,'The actual sky view avoids broad white clipping');
      fs.writeFileSync(path.join(report, 'nebula-' + name + '.png'), buffer);
      const errors = await page.evaluate(() => window.__nebulaGL.map(({ gl }) => gl.getError())); assert.ok(errors.every(code => code === 0));
      result.graphics.push({ name, errors }); result.captures.push({ name, width: image.width, height: image.height, pixelHash: hash(image.pixels), stats, snapshot: actual.snapshot, flyby: (await info()).flyby }); save(); console.log('Captured nebula-' + name + '.png'); return image;
    }
    async function launch({ fullscreen = false } = {}) {
      if (fullscreen) await open();
      const button = (fullscreen ? panel.locator('#uf-inview-scenic-flights') : page.locator('#uf-scenic-flights')).locator('[data-scenic-flight="nebula"]');
      await button.focus(); await button.press('Enter');
      await page.waitForFunction(() => window.__nebulaInfo?.flyby?.active && window.__nebulaInfo.running);
      await focusedCanvas(); assert.equal(await panel.count(), 0); await pause();
      const fresh = await snapshot(), launch = await page.evaluate(() => window.__nebulaLaunches.at(-1));
      assert.equal(launch.accepted, true); assert.equal(fresh.settings.mode, 'explore'); assert.equal(fresh.settings.region, 'neighborhood');
      for (const key of ['distanceLy', 'universeYears', 'travelerYears']) assert.equal(launch.after.state[key], 0, 'Fresh launch resets ' + key);
      assert.equal((await info()).motion.kind, 'flyby'); assert.equal((await info()).flyby.autoLook, true);
      result.launches = result.launches || []; result.launches.push(launch); return fresh;
    }
    async function rate(value, { fullscreen = false } = {}) {
      if (fullscreen) await open();
      await page.locator(fullscreen ? '#uf-inview-flyby-rate' : '#uf-flyby-rate').selectOption(String(value));
      await page.waitForFunction(value => window.__nebulaInfo?.flyby?.rate === value, value); await next();
    }
    async function milestone(progress, name) {
      if ((await info()).flyby.progress < progress) { await play(); await page.waitForFunction(progress => window.__nebulaInfo?.flyby?.progress >= progress, progress, { timeout: 90000 }); await pause(); }
      const current = await info(); assert.ok(current.flyby.progress >= progress && current.flyby.progress < 1);
      const saved = await snapshot(); result.progressSamples.push({ name, flyby: current.flyby, position: saved.state.position, distanceLy: saved.state.distanceLy }); return capture(name);
    }
    async function stable(name) {
      const saved = await pause(), frozen = (await info()).flyby, first = await capture(name);
      await page.waitForTimeout(220); const second = await page.evaluate(() => window.__nebulaScene.capture());
      assert.deepEqual(png(Buffer.from(second.dataUrl.split(',')[1], 'base64')).pixels, first.pixels); assert.deepEqual(second.snapshot, saved); assert.deepEqual((await info()).flyby, frozen); return first;
    }

    await compareFixedCloudViews(page);
    const catalog = await page.evaluate(() => ({ flybys: UniverseFlight.flybys(), landmarks: ['neighborhood', 'galaxy', 'cosmic'].flatMap(region => UniverseFlight.landmarks(region)), galaxy: UniverseFlight.landmarks('galaxy') }));
    assert.equal(catalog.landmarks.length, 18); assert.equal(catalog.galaxy.filter(item => /^halo-cluster-[1-6]$/.test(item.id)).length, 6);
    for (const cluster of catalog.galaxy.filter(item => /^halo-cluster/.test(item.id))) assert.equal(cluster.arrivalRadiusLy, 600);
    assert.ok(catalog.flybys.some(item => item.id === 'nebula')); assert.equal(catalog.landmarks.filter(item => ['blue-nebula','violet-nebula'].includes(item.id)).length, 2); result.catalog = catalog;
    check('Nebula passage metadata, both generated emission regions, and all six existing Halo clusters are selectable');

    // Native launch from the normal UI, then use the real fullscreen renderer throughout.
    await page.getByRole('button', { name: 'Einstein’s light chase', exact: true }).click();
    await page.getByRole('button', { name: 'Free exploration', exact: true }).click();
    await page.evaluate(() => { const scene = window.__nebulaScene, saved = scene.snapshot(); Object.assign(saved.state, { distanceLy: 123, universeYears: 45, travelerYears: 12 }); scene.restore(saved); });
    const before = await snapshot(); await launch(); const normalStart = await snapshot();
    assert.equal(normalStart.settings.beta, before.settings.beta); assert.equal(normalStart.settings.quality, before.settings.quality);
    await enter(); const startImage = await stable('start'); check('normal keyboard launch starts Free exploration, resets the journey, and keeps physics and quality preferences');
    await rate(2, { fullscreen: true }); await axeScope('desktop-paused-controls'); await close();
    const approach = await milestone(.20, 'blue-approach');
    await milestone(.33, 'blue-filaments');
    const clusterImage = await milestone(.50, 'blue-pass'); await stable('nebula-paused');
    const changed = difference(startImage, clusterImage); assert.ok(changed.changedFraction > .005 && changed.meanAbsolute > .1); result.travelDifference = changed;
    check('the real curved passage visibly traverses layered emission regions and the paused view freezes both pixels and elapsed travel');

    const manualBefore = await snapshot(); await canvas.focus(); await canvas.press('ArrowRight'); await canvas.press('ArrowUp'); await next();
    const manual = await snapshot(); assert.notEqual(manual.state.yaw, manualBefore.state.yaw); assert.notEqual(manual.state.pitch, manualBefore.state.pitch); assert.deepEqual(manual.state.position, manualBefore.state.position); assert.equal((await info()).flyby.autoLook, false);
    const manualProgress = (await info()).flyby.progress; await play(); await page.waitForFunction(progress => window.__nebulaInfo.flyby.progress > progress + .015, manualProgress, { timeout: 30000 }); await pause();
    const movedManual = await snapshot(); assert.equal(movedManual.state.yaw, manual.state.yaw); assert.equal(movedManual.state.pitch, manual.state.pitch); assert.notDeepEqual(movedManual.state.position, manual.state.position); await capture('manual-look');
    await open(); await panel.locator('#uf-inview-flyby-follow').focus(); await panel.locator('#uf-inview-flyby-follow').press('Enter'); await page.waitForFunction(() => window.__nebulaInfo.flyby.autoLook); await close(); await capture('follow-restored');
    check('native free look keeps the authored route moving with independent gaze, and Follow flyby view restores the camera aim');
    await rate(.5, { fullscreen: true }); assert.equal((await info()).flyby.rate, .5); await close(); await rate(2, { fullscreen: true }); await close();
    check('native Slow and Fast pacing controls change the real flyby rate without changing physics');
    const between=await milestone(.62,'between-clouds');result.depthDifference=difference(clusterImage,between);assert.ok(result.depthDifference.changedFraction>.005);
    const reveal = await milestone(.80, 'violet-reveal'), revealDifference = difference(clusterImage, reveal); assert.ok(revealDifference.changedFraction > .005); result.revealDifference = revealDifference;
    const stopsBefore = await page.evaluate(() => window.__nebulaPauses.filter(item => item.detail?.kind === 'flyby').length); await play();
    await page.waitForFunction(() => window.__nebulaInfo?.flyby?.completed && !window.__nebulaInfo.running, {}, { timeout: 90000 });
    const finish = await stable('completed'), finishInfo = await info(), finished = await snapshot();
    assert.equal(finishInfo.flyby.progress, 1); assert.equal(finishInfo.motion.paceLyPerSecond, 0); assert.equal(finished.targetId, 'violet-nebula');
    assert.equal(finished.state.universeYears, 0); assert.equal(finished.state.travelerYears, 0);
    const stopEvents = await page.evaluate(() => window.__nebulaPauses.filter(item => item.detail?.kind === 'flyby')); assert.equal(stopEvents.length, stopsBefore + 1); result.completion = { snapshot: finished, info: finishInfo, event: stopEvents.at(-1) };
    await stage.locator('#uf-stage-journey').waitFor({ state: 'visible' }); assert.ok((await stage.locator('#uf-stage-journey').innerText()).includes('Nebula passage complete')); await stage.screenshot({ path: path.join(report, 'nebula-completed-ui.png') }); await axeScope('desktop-completion');
    check('the renderer completes once, pauses at the final violet nebula reveal, and presents a real journey checkpoint');

    await open(); const completeControls = panel.locator('#uf-inview-flyby-status'); assert.equal(await completeControls.getAttribute('data-flyby-state'), 'completed');
    assert.equal(await panel.locator('#uf-inview-flyby-rate').isDisabled(), true); assert.equal(await panel.locator('#uf-inview-flyby-follow').isDisabled(), true);
    const replay = completeControls.locator('[data-flyby-replay="nebula"]'); await replay.focus(); await replay.press('Enter'); await page.waitForFunction(() => window.__nebulaInfo.flyby.active && window.__nebulaInfo.running); await focusedCanvas(); await pause();
    const replayLaunch=await page.evaluate(()=>window.__nebulaLaunches.at(-1)); assert.equal(replayLaunch.accepted,true);assert.deepEqual(replayLaunch.args,['nebula']);assert.deepEqual(replayLaunch.after.state.position,catalog.flybys.find(item=>item.id==='nebula').position);assert.equal(replayLaunch.after.targetId,'blue-nebula');result.replayLaunch=replayLaunch;assert.equal(replayLaunch.after.state.distanceLy,0); assert.equal(replayLaunch.after.state.universeYears,0); assert.equal(replayLaunch.after.state.travelerYears,0); check('completed controls expose a native Replay flyby action that begins a fresh route');

    // Cancellation and public snapshot restore must stop route motion, not leave a hidden timer running.
    await open(); await panel.locator('#uf-inview-mode').selectOption('relativity'); await page.waitForFunction(() => window.__nebulaScene.snapshot().settings.mode === 'relativity');
    await launch({ fullscreen: true }); assert.equal((await snapshot()).settings.mode, 'explore'); check('fullscreen keyboard launch explicitly switches Einstein’s light chase to Free exploration');
    await rate(2, { fullscreen: true }); await close(); await milestone(.05, 'cancel-before');
    await open(); await panel.locator('#uf-inview-flyby-cancel').focus(); await panel.locator('#uf-inview-flyby-cancel').press('Enter'); await page.waitForFunction(() => !window.__nebulaInfo.flyby.active && !window.__nebulaInfo.running); await close();
    const canceled = await snapshot(); await page.waitForTimeout(180); assert.deepEqual(await snapshot(), canceled); result.canceled = { snapshot: canceled, flyby: (await info()).flyby };
    check('ending the flyby from its native controls pauses the real camera and clears the route');
    await launch({ fullscreen: true }); const saved = await snapshot(); await play(); await page.waitForFunction(() => window.__nebulaInfo.flyby.progress > .02); await pause();
    assert.equal(await page.evaluate(saved => window.__nebulaScene.restore(saved), saved), true); await next(); assert.equal((await info()).flyby.active, false); assert.equal((await info()).running, false); assert.deepEqual((await snapshot()).state.position, saved.state.position);
    check('restoring an ordinary saved view clears the flyby and always returns paused');

    // Both new destinations use the existing real world-space approach/orbit controls.
    result.nebulaNavigation=[];
    for(const target of catalog.landmarks.filter(item=>['blue-nebula','violet-nebula'].includes(item.id))){
      const position=target.position.map((value,i)=>value+(i===0?target.arrivalRadiusLy+12:0));
      await page.evaluate(position=>{const saved=window.__nebulaScene.snapshot();Object.assign(saved.settings,{region:'neighborhood',mode:'explore',fov:64});Object.assign(saved.state,{position,distanceLy:0});saved.targetId=null;window.__nebulaScene.restore(saved);},position);
      await open();await panel.locator('#uf-inview-destination').selectOption(target.id);await panel.locator('#uf-inview-arrival').selectOption('1');
      await open('travel');const speedControl=panel.locator('#uf-inview-speed');await speedControl.focus();await speedControl.press('End');await page.waitForFunction(()=>window.__nebulaInfo.motion.targetLyPerSecond===50);await open();
      const approachButton=panel.locator('.uf-inview-destination-actions').getByRole('button',{name:'Fly to destination',exact:true});await approachButton.focus();await approachButton.press('Enter');
      await page.waitForFunction(()=>window.__nebulaInfo.navigation.completed&&!window.__nebulaInfo.running,{},{timeout:30000});
      const arrived=await snapshot(),separation=Math.hypot(...arrived.state.position.map((value,i)=>value-target.position[i]));assert.ok(Math.abs(separation-target.arrivalRadiusLy)<1e-7);await capture(target.id+'-arrival');
      await open();await axeScope(target.id+'-destination-controls');
      const orbitButton=panel.locator('.uf-inview-destination-actions').getByRole('button',{name:'Orbit destination',exact:true});await orbitButton.focus();await orbitButton.press('Enter');
      await page.waitForFunction(position=>Math.hypot(...window.__nebulaScene.snapshot().state.position.map((value,i)=>value-position[i]))>.02,arrived.state.position,{timeout:30000});await pause();
      const orbited=await snapshot(),orbitRadius=Math.hypot(...orbited.state.position.map((value,i)=>value-target.position[i]));assert.ok(Math.abs(orbitRadius-target.arrivalRadiusLy)<1e-7);await capture(target.id+'-orbit');
      result.nebulaNavigation.push({id:target.id,separation,orbitRadius});
    }
    check('both emission-region destinations pause at their real viewing radius and camera orbits retain that radius');

    const overlooks=[{name:'Blue cloud overlook',position:[-12,12,14],aim:[9,-2,34],targetId:'blue-nebula',index:2},{name:'Violet cloud overlook',position:[-36,29,52],aim:[-22,11,83],targetId:'violet-nebula',index:3}];
    for(const view of overlooks){
      await open();await panel.locator('#uf-inview-vista').selectOption(String(view.index));await page.waitForFunction(id=>window.__nebulaScene.snapshot().targetId===id,view.targetId);await pause();
      const actual=await snapshot();assert.deepEqual(actual.state.position,view.position);assert.equal(actual.settings.fov,65);assert.equal(actual.state.distanceLy,0);await capture(view.targetId+'-overlook');
      await exit();const button=page.locator('.uf-vista-list button').filter({hasText:view.name});await button.focus();await button.press('Enter');await next();assert.ok(await button.evaluate(node=>document.activeElement===node),'Normal scenic viewpoints retain keyboard focus on their native launcher');
      assert.deepEqual(await snapshot(),actual,'Normal and fullscreen overlook controls restore the same saved viewpoint');await enter();
    }
    check('both cloud overlooks reset the journey and restore identical paused views through native normal and fullscreen controls');

    await verifyRendererInvariants(page, result.baseline);
    check('exactly 1,000 local cloud lights receive 2.4/1.35 gain and profiles add +4; only the accepted cloud-detail shader lines and atlas red channel change, while other point bytes, cloud alpha/G/B, galaxy atlas, preserved Halo metadata, and relativity math match enhanced 24');

    // Dispose through the real tool UI, reopen, then launch through the new route again.
    await exit(); await page.getByRole('button', { name: 'Close flight explorer', exact: true }).click(); await page.waitForFunction(() => !document.querySelector('.uf-stage'));
    result.disposal = await page.evaluate(() => window.__nebulaGL.map(({ gl, record }) => ({ created: record.created, deleted: record.deleted, live: record.textures.filter(texture => gl.isTexture(texture)).length })));
    assert.ok(result.disposal.every(record => record.created === 2 && record.deleted === 2 && record.live === 0));
    result.gpuDisposal=await page.evaluate(()=>window.__nebulaGL.map(({gl,record})=>{const pending=record.programs.filter(item=>gl.isProgram(item)&&gl.getProgramParameter(item,gl.DELETE_STATUS)),before=record.programs.filter(item=>gl.isProgram(item)).length;gl.useProgram(null);return {buffersCreated:record.buffers.length,buffersDeleted:record.buffersDeleted,buffersLive:record.buffers.filter(item=>gl.isBuffer(item)).length,programsCreated:record.programs.length,programsDeleted:record.programsDeleted,programsLiveBeforeUnbind:before,programsPendingDeletion:pending.length,programsLive:record.programs.filter(item=>gl.isProgram(item)).length};}));
    for(const record of result.gpuDisposal){assert.equal(record.buffersCreated,record.buffersDeleted);assert.equal(record.programsCreated,record.programsDeleted);assert.equal(record.buffersLive,0);assert.equal(record.programsLiveBeforeUnbind,record.programsPendingDeletion);assert.equal(record.programsLive,0);}
    await page.getByRole('button', { name: 'Open 3D flight', exact: true }).click(); await page.waitForFunction(() => window.__nebulaScenes.length === 2 && window.__nebulaStatus?.state === 'ready');
    await launch(); await rate(.5); assert.equal((await info()).flyby.rate, .5);
    await page.locator('#uf-flyby-cancel').focus(); await page.locator('#uf-flyby-cancel').press('Enter'); await page.waitForFunction(() => !window.__nebulaInfo.flyby.active && !window.__nebulaInfo.running);
    await launch(); await enter(); await capture('reopened-start');
    const newResources = await page.evaluate(() => { const { gl, record } = window.__nebulaGL.at(-1); return { created: record.created, deleted: record.deleted, live: record.textures.filter(texture => gl.isTexture(texture)).length }; }); assert.deepEqual(newResources, { created: 2, deleted: 0, live: 2 }); result.reopenedResources = newResources;
    result.reopenedGPU=await page.evaluate(()=>{const {gl,record}=window.__nebulaGL.at(-1);return {buffersCreated:record.buffers.length,buffersLive:record.buffers.filter(item=>gl.isBuffer(item)).length,programsCreated:record.programs.length,programsLive:record.programs.filter(item=>gl.isProgram(item)).length};});assert.equal(result.reopenedGPU.buffersCreated,result.gpuDisposal[0].buffersCreated);assert.equal(result.reopenedGPU.programsCreated,result.gpuDisposal[0].programsCreated);
    check('closing releases both textures and reopening starts a working flyby with native normal pace/end controls and the same resource count');

    for (const viewport of [{ width: 320, height: 740 }, { width: 568, height: 320 }]) {
      await exit(); await page.setViewportSize(viewport); await next(); const name = viewport.width === 320 ? 'phone' : 'landscape';
      const normal = page.locator('#uf-scenic-flights'); assert.ok(await normal.evaluate(node => node.scrollWidth <= node.clientWidth + 1)); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const launchButton = normal.locator('[data-scenic-flight="nebula"]'); await launchButton.scrollIntoViewIfNeeded(); const box = await launchButton.boundingBox(); assert.ok(box && box.width > 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= viewport.width + 1);
      await normal.screenshot({ path: path.join(report, 'nebula-' + name + '-launcher.png') }); await axeScope(name + '-normal-launcher', normal); await launch();
      const normalControls=page.locator('#uf-flyby-status');await normalControls.scrollIntoViewIfNeeded();await normalControls.screenshot({path:path.join(report,'nebula-'+name+'-normal-controls.png')});await axeScope(name+'-normal-controls',normalControls);
      await rate(.5);assert.equal((await info()).flyby.rate,.5);await enter();
      await open(); const fullscreenLaunch = panel.locator('#uf-inview-scenic-flights'); await axeScope(name + '-fullscreen-controls');
      await fullscreenLaunch.locator('[data-scenic-flight="nebula"]').scrollIntoViewIfNeeded(); const fullscreenBox = await fullscreenLaunch.locator('[data-scenic-flight="nebula"]').boundingBox(), shell = await panel.boundingBox(); assert.ok(fullscreenBox.height >= 44 && fullscreenBox.x >= 0 && fullscreenBox.x + fullscreenBox.width <= viewport.width + 1); assert.ok(shell.x >= 0 && shell.y >= 0 && shell.x + shell.width <= viewport.width + 1 && shell.y + shell.height <= viewport.height + 1);
      await stage.screenshot({ path: path.join(report, 'nebula-' + name + '-controls.png') }); await launch({ fullscreen: true }); await rate(.5, { fullscreen: true }); await close(); await capture(name + '-fullscreen-start');
      await open(); await panel.locator('#uf-inview-flyby-cancel').focus(); await panel.locator('#uf-inview-flyby-cancel').press('Enter'); await page.waitForFunction(() => !window.__nebulaInfo.flyby.active); await close(); await focusedCanvas();
      result.layouts.push({ name, viewport, box, fullscreenBox, shell }); check(name + ' normal/fullscreen native keyboard launches, pace controls, and end controls remain reachable without overflow');
    }
    result.progressSamples = result.progressSamples.concat(await page.evaluate(() => window.__nebulaSamples));
    assert.deepEqual(result.errors, []); assert.equal(hash(fs.readFileSync(sourceFile)), result.sourceHash); assert.equal(hash(fs.readFileSync(uiFile)), result.uiHash);
    const servedSource = result.served.find(entry => /universe_flight_scene\.js/.test(entry.url)), servedUI = result.served.find(entry => /stem_tool_universe\.js/.test(entry.url)); assert.equal(servedSource?.status, 200); assert.equal(servedSource?.hash, result.sourceHash); assert.equal(servedUI?.status, 200); assert.equal(servedUI?.hash, result.uiHash);
    result.completed = true; save(); console.log('Nebula passage passed: ' + result.checks.length + ' groups, ' + result.accessibility.length + ' accessibility scopes, ' + result.captures.length + ' actual captures; source ' + result.sourceHash + '.');
  } catch (error) { result.failure = String(error); save(); throw error; } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
