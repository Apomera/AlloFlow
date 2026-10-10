'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const stage = __dirname, repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', report = path.join(stage, 'native-beta-visible-report');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const pins = { baseline: 'c0cc2486b3d5edd620e5975daec3d23b8f2e995a24db151be27ac30820d058c7', candidate: '8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9' };
const sources = Object.fromEntries(Object.keys(pins).map(phase => { const source = fs.readFileSync(path.join(stage, phase + '-renderer.js'), 'utf8'); assert.equal(sha(source), pins[phase]); return [phase, source]; }));
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright';
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
fs.mkdirSync(report, { recursive: true });
const cases = [{ name: 'beta09-edge-visible', beta: .9, edge: true, layer: 'target', fov: 50 }];
const result = { completed: false, pins, harnessSha256: sha(fs.readFileSync(__filename)), cases, captures: [], resources: [], math: {}, errors: [], originalAttempt: { harnessSha256: '623aa8e14b35f6f8c2620fef75f82b715b7ba37409d412130730cc7bef84bc6b', report: '../native-beta-report/check.json', beta09Scope: 'Compile and finite upload only; rest-direction aim placed the aberrated target outside the frame, yielding zero emitted pixels.', beta099Scope: 'Meaningful dim rear-facing emission remains valid and preserved.' } };
const save = () => fs.writeFileSync(path.join(report, 'check.json'), JSON.stringify(result, null, 2) + '\n');
function installProbe() {
  window.__programs = []; window.__layer = 'full';
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, ...args) {
    const gl = getContext.call(this, type, ...args); if (type !== 'webgl' || !gl) return gl;
    const p = { gl, counts: {}, finiteUploads: true, marker: null, beta: null, contextLoss: 0 };
    window.__probe = p; this.addEventListener('webglcontextlost', () => p.contextLoss++);
    for (const [create, remove, label] of [['createTexture','deleteTexture','Textures'],['createBuffer','deleteBuffer','Buffers'],['createProgram','deleteProgram','Programs'],['createShader','deleteShader','Shaders']]) {
      p.counts['created' + label] = p.counts['deleted' + label] = 0;
      const c = gl[create].bind(gl), d = gl[remove].bind(gl);
      gl[create] = (...args) => { p.counts['created' + label]++; const resource = c(...args); if (label === 'Programs') __programs.push(resource); return resource; };
      gl[remove] = resource => { if (resource) p.counts['deleted' + label]++; return d(resource); };
    }
    const locations = new Map(), getUniformLocation = gl.getUniformLocation.bind(gl), uniform1f = gl.uniform1f.bind(gl), bufferData = gl.bufferData.bind(gl), bufferSubData = gl.bufferSubData.bind(gl), useProgram = gl.useProgram.bind(gl), drawArrays = gl.drawArrays.bind(gl);
    gl.getUniformLocation = (program, name) => { const location = getUniformLocation(program, name); locations.set(location, name); return location; };
    gl.uniform1f = (location, value) => { if (locations.get(location) === 'u_beta') p.beta = value; return uniform1f(location, value); };
    gl.bufferData = (target, values, ...rest) => { if (values instanceof Float32Array) p.finiteUploads &&= values.every(Number.isFinite); return bufferData(target, values, ...rest); };
    gl.bufferSubData = (target, offset, values, ...rest) => { if (values instanceof Float32Array) { p.finiteUploads &&= values.every(Number.isFinite); if (offset === 18432) p.marker = values[5]; } return bufferSubData(target, offset, values, ...rest); };
    gl.useProgram = program => { __currentProgram = program; return useProgram(program); };
    gl.drawArrays = (mode, first, count) => { if (__layer === 'full') return drawArrays(mode, first, count); if (__currentProgram !== __programs[1]) return; drawArrays(mode, 0, 384); drawArrays(mode, 384, 384); if (__phase === 'candidate') drawArrays(mode, 768, 384); };
    return gl;
  };
}
async function sample(page, spec) {
  return page.evaluate(spec => {
    const position = spec.edge ? [Math.cos(-.22) * 156000, Math.sin(-.22) * 156000, 0] : spec.position;
    const chiefRay = position.map(value => -value / Math.hypot(...position)), direction = UniverseFlight.math.aberrate(chiefRay, spec.beta), snapshot = __scene.snapshot();
    Object.assign(snapshot.settings, { mode: 'relativity', region: 'galaxy', beta: spec.beta, compareRest: false, quality: 'high', exposure: 1, fov: spec.fov, running: false });
    Object.assign(snapshot.state, { position, yaw: Math.atan2(direction[0], direction[2]), pitch: Math.atan2(direction[1], Math.hypot(direction[0], direction[2])), distanceLy: 0, universeYears: 0, travelerYears: 0 });
    snapshot.targetId = null; __layer = spec.layer;
    if (!__scene.restore(snapshot)) throw new Error('Rejected beta pose'); __scene.set({ running: false });
    const capture = __scene.capture(); if (!capture) throw new Error('Beta capture unavailable');
    const gl = __probe.gl, pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4); gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let clipped = 0, signal = 0, maxChannel = 0, nonzeroEmittedPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) { const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]; if (Math.min(r,g,b) >= 250) clipped++; const light = .2126 * Math.max(0,r-1) + .7152 * Math.max(0,g-3) + .0722 * Math.max(0,b-6); signal += light; if (light > 1) nonzeroEmittedPixels++; maxChannel = Math.max(maxChannel,r,g,b); }
    return { ...capture, finiteUploads: __probe.finiteUploads, diskMarker: __probe.marker, actualBeta: __probe.beta, glError: gl.getError(), width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, clippedFraction: clipped / (pixels.length / 4), sumEmittedLuminance: signal, maxChannel, nonzeroEmittedPixels, chiefRay, apparentAim: direction };
  }, spec);
}
(async () => {
  save(); let browser;
  try {
    browser = await chromium.launch({ args: ['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
    for (const phase of ['baseline','candidate']) {
      const context = await browser.newContext({ viewport: { width: 720, height: 480 }, deviceScaleFactor: 1 }), page = await context.newPage();
      page.on('pageerror', error => result.errors.push({ phase, error: String(error) })); page.on('console', message => { if (message.type() === 'error') result.errors.push({ phase, error: message.text() }); });
      await page.route('http://127.0.0.1:3187/beta-native', route => route.fulfill({ contentType: 'text/html', body: '<style>body{margin:0;background:#000}canvas{display:block;width:720px;height:480px}</style><canvas></canvas>' }));
      await page.goto('http://127.0.0.1:3187/beta-native'); await page.evaluate(phase => { window.__phase = phase; }, phase); await page.evaluate(installProbe); await page.addScriptTag({ content: sources[phase] });
      await page.evaluate(() => { window.__scene = UniverseFlight.create(document.querySelector('canvas'), { onStatus(status) { window.__status = status; } }); }); await page.waitForFunction(() => __status?.state === 'ready');
      result.math[phase] = await page.evaluate(async () => { const functions = {}; for (const [name,fn] of Object.entries(UniverseFlight.math)) functions[name] = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fn.toString())))).map(b=>b.toString(16).padStart(2,'0')).join(''); const samples = []; for (const beta of [.9,.99]) for (const mu of [-1,-.75,0,.5,1]) samples.push({ beta,mu,gamma:UniverseFlight.math.gamma(beta),doppler:UniverseFlight.math.doppler(mu,beta),aberrated:UniverseFlight.math.aberrate([Math.sqrt(1-mu*mu),0,mu],beta) }); return {functions,samples}; });
      for (const spec of cases) {
        const capture = await sample(page, spec), bytes = Buffer.from(capture.dataUrl.split(',')[1], 'base64'), file = phase + '-' + spec.name + '.png'; delete capture.dataUrl; fs.writeFileSync(path.join(report,file),bytes);
        assert.equal(capture.actualBeta,spec.beta); assert.equal(capture.finiteUploads,true); assert.equal(capture.glError,0); assert.ok(Number.isFinite(capture.sumEmittedLuminance) && capture.sumEmittedLuminance > 0, 'Visible emitted light'); assert.ok(capture.nonzeroEmittedPixels > 0, 'Visible emitted pixels'); assert.ok(capture.clippedFraction < .03); if (phase === 'candidate') assert.ok(capture.diskMarker < -1, 'New diffuse disk is uploaded with positive finite emission');
        const repeated = await page.evaluate(() => __scene.capture().dataUrl); assert.equal(sha(Buffer.from(repeated.split(',')[1],'base64')),sha(bytes),'Paused beta pixels stable');
        result.captures.push({phase,name:spec.name,file,hash:sha(bytes),...capture}); console.log(phase + ' ' + spec.name); save();
      }
      await page.evaluate(() => __scene.dispose()); const resources = await page.evaluate(() => ({...__probe.counts,finiteUploads:__probe.finiteUploads,contextLoss:__probe.contextLoss,error:__probe.gl.getError()}));
      for (const label of ['Textures','Buffers','Programs','Shaders']) assert.equal(resources['created'+label],resources['deleted'+label]); assert.deepEqual([resources.createdTextures,resources.createdBuffers,resources.createdPrograms,resources.createdShaders],[2,2,2,4]); assert.equal(resources.error,0); assert.equal(resources.contextLoss,0);
      result.resources.push({phase,...resources}); await context.close(); save();
    }
    assert.deepEqual(result.math.candidate,result.math.baseline); assert.notEqual(result.captures[0].hash,result.captures[1].hash,'Candidate disk branch changes visible pixels'); assert.deepEqual(result.errors,[]);
    for (const spec of cases) assert.deepEqual(result.captures.find(c=>c.phase==='candidate'&&c.name===spec.name).snapshot,result.captures.find(c=>c.phase==='baseline'&&c.name===spec.name).snapshot,'Beta camera unchanged');
    for (const phase of Object.keys(pins)) assert.equal(sha(fs.readFileSync(path.join(stage,phase+'-renderer.js'))),pins[phase]);
    result.completed=true; save(); console.log(JSON.stringify({completed:true,captures:result.captures.length,harnessSha256:result.harnessSha256,errors:result.errors},null,2));
  } catch(error) { result.failure=String(error); save(); throw error; }
  finally { if(browser) await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
