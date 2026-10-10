'use strict';
// Staged-only WebGL comparison. Run only after the candidate audit and approval.
// node native-check.cjs --candidate-sha=<sha256>
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const repo = process.env.UNIVERSE_REPO || 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const stage = __dirname;
const report = path.join(stage, 'native-report');
const baselinePin = 'c0cc2486b3d5edd620e5975daec3d23b8f2e995a24db151be27ac30820d058c7';
const candidatePin = process.argv.find(a => a.startsWith('--candidate-sha='))?.split('=')[1];
assert.match(candidatePin || '', /^[0-9a-f]{64}$/, 'Explicit audited candidate SHA is required');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sources = Object.fromEntries(['baseline', 'candidate'].map(phase => [phase, fs.readFileSync(path.join(stage, phase + '-renderer.js'), 'utf8')]));
assert.equal(sha(sources.baseline), baselinePin, 'Baseline renderer pin');
assert.equal(sha(sources.candidate), candidatePin, 'Candidate renderer pin');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
fs.mkdirSync(report, { recursive: true });
const result = { completed: false, pins: { baseline: baselinePin, candidate: candidatePin }, matrix: [], captures: [], proof: {}, comparisons: [], resources: [], stability: [], nearObserver: [], errors: [] };
const save = () => fs.writeFileSync(path.join(report, 'check.json'), JSON.stringify(result, null, 2) + '\n');
const images = new Map();

function pixels(bytes) {
  let width, height, channels, offset = 8;
  const parts = [];
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  while (offset < bytes.length) {
    const size = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString(), data = bytes.subarray(offset + 8, offset + 8 + size);
    offset += size + 12;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.equal(data[8], 8); assert.ok([2, 6].includes(data[9])); channels = data[9] === 6 ? 4 : 3; }
    if (type === 'IDAT') parts.push(data);
    if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(parts)), stride = width * channels, data = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c); return da <= db && da <= dc ? a : db <= dc ? b : c; };
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
    const i = y * stride + x, f = raw[y * (stride + 1)], a = x >= channels ? data[i - channels] : 0, b = y ? data[i - stride] : 0, c = y && x >= channels ? data[i - stride - channels] : 0;
    assert.ok(f <= 4);
    data[i] = (raw[y * (stride + 1) + 1 + x] + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
  }
  return { width, height, channels, data };
}
function stats(bytes) {
  const p = pixels(bytes), luminance = new Float64Array(p.width * p.height);
  let sum = 0, clipped = 0, nonblack = 0, xsum = 0, ysum = 0;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const i = (y * p.width + x) * p.channels, r = p.data[i], g = p.data[i + 1], b = p.data[i + 2], l = .2126 * Math.max(0, r - 1) + .7152 * Math.max(0, g - 3) + .0722 * Math.max(0, b - 6);
    luminance[y * p.width + x] = l; sum += l; xsum += x * l; ysum += y * l;
    if (l > 1) nonblack++;
    if (Math.min(r, g, b) >= 250) clipped++;
  }
  const cx = sum ? xsum / sum : 0, cy = sum ? ysum / sum : 0;
  let xx = 0, yy = 0, xy = 0, outer = 0;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const l = luminance[y * p.width + x], dx = x - cx, dy = y - cy;
    xx += dx * dx * l; yy += dy * dy * l; xy += dx * dy * l;
    // Exclude the central bulge to measure the surrounding emitted disk.
    if (Math.hypot(dx, dy) > p.height * .12) outer += l;
  }
  const discriminant = Math.hypot(xx - yy, 2 * xy), major = sum ? Math.sqrt(Math.max(0, (xx + yy + discriminant) / (2 * sum))) : 0, minor = sum ? Math.sqrt(Math.max(0, (xx + yy - discriminant) / (2 * sum))) : 0;
  return { width: p.width, height: p.height, sumLuminance: sum, meanLuminance: sum / (p.width * p.height), outerLuminance: outer, nonblackPixels: nonblack, clippedFraction: clipped / (p.width * p.height), centroid: [cx, cy], majorSigma: major, minorSigma: minor };
}
function difference(aBytes, bBytes) {
  const a = pixels(aBytes), b = pixels(bBytes);
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  let absolute = 0, changed = 0, maximum = 0;
  for (let pixel = 0; pixel < a.width * a.height; pixel++) { let d = 0; for (let channel = 0; channel < 3; channel++) d += Math.abs(a.data[pixel * a.channels + channel] - b.data[pixel * b.channels + channel]); absolute += d; maximum = Math.max(maximum, d / 3); if (d) changed++; }
  return { meanAbsoluteRgb: absolute / (a.width * a.height * 3), changedFraction: changed / (a.width * a.height), maxMeanRgb: maximum };
}

const cases = [];
function add(name, region, index, inclination, extra = {}) { cases.push({ name, region, index, inclination, range: 3, fov: 50, dpr: 1, layer: 'target', ...extra }); }
for (const inclination of [0, 45, 85, 90, 95]) add('galaxy-' + inclination, 'galaxy', 0, inclination);
for (const [index, name] of [[0, 'cosmic-spiral'], [1, 'cosmic-twoarm'], [2, 'cosmic-barred']]) for (const inclination of [0, 90]) add(name + '-' + inclination, 'cosmic', index, inclination);
for (const inclination of [0, 90]) add('elliptical-' + inclination, 'cosmic', 3, inclination);
add('galaxy-90-range6', 'galaxy', 0, 90, { range: 6 });
add('galaxy-90-range12', 'galaxy', 0, 90, { range: 12 });
add('galaxy-0-dpr2', 'galaxy', 0, 0, { dpr: 2 });
add('galaxy-90-dpr2', 'galaxy', 0, 90, { dpr: 2 });
add('galaxy-near', 'galaxy', 0, 90, { range: .08, fov: 80 });
add('galaxy-90-full', 'galaxy', 0, 90, { layer: 'full' });
add('cosmic-disk-profile-full', 'cosmic', 0, 90, { layer: 'full', axis: 'z', distance: 450000, fov: 32 });
assert.equal(cases.length, 20);
result.matrix = cases;

async function settled(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function pose(page, spec) {
  await page.evaluate(spec => {
    const m = __native.models(spec.region).galaxies[spec.index], radians = spec.inclination * Math.PI / 180;
    const local = spec.axis === 'z' ? [0, Math.cos(radians), Math.sin(radians)] : [Math.sin(radians), Math.cos(radians), 0];
    const ct = Math.cos(m.tilt), st = Math.sin(m.tilt), cr = Math.cos(m.turn), sr = Math.sin(m.turn), ty = local[1] * ct - local[2] * st, tz = local[1] * st + local[2] * ct;
    const vector = [local[0] * cr - ty * sr, local[0] * sr + ty * cr, tz], distance = spec.distance || m.radius * spec.range;
    const position = m.center.map((c, i) => c + vector[i] * distance), direction = m.center.map((c, i) => c - position[i]);
    const snapshot = __scene.snapshot();
    Object.assign(snapshot.settings, { mode: 'explore', region: spec.region, beta: 0, compareRest: false, quality: 'high', fov: spec.fov, exposure: 1, running: false });
    Object.assign(snapshot.state, { position, yaw: Math.atan2(direction[0], direction[2]), pitch: Math.atan2(direction[1], Math.hypot(direction[0], direction[2])), distanceLy: 0, universeYears: 0, travelerYears: 0 });
    snapshot.targetId = null;
    const models = __native.models(spec.region).galaxies, spiralOrdinal = models.slice(0, spec.index).filter(m => !m.elliptical).length, spiralCount = models.filter(m => !m.elliptical).length;
    __selection = { layer: spec.layer, index: spec.index, models: models.length, spiralOrdinal, spiralCount, elliptical: m.elliptical };
    if (!__scene.restore(snapshot)) throw new Error('Rejected native pose ' + spec.name);
    __scene.set({ running: false });
  }, spec);
  await settled(page);
}
async function canvasBytes(page) {
  // The production capture API draws and reads before the drawing buffer swaps.
  const url = await page.evaluate(() => { const capture = __scene.capture(); if (!capture) throw new Error('Native capture unavailable'); return capture.dataUrl; });
  return Buffer.from(url.split(',')[1], 'base64');
}
async function capture(page, phase, spec) {
  await pose(page, spec);
  const bytes = await canvasBytes(page), file = phase + '-' + spec.name + '.png';
  fs.writeFileSync(path.join(report, file), bytes); images.set(phase + ':' + spec.name, bytes);
  result.captures.push({ phase, name: spec.name, file, hash: sha(bytes), statistics: stats(bytes), snapshot: await page.evaluate(() => __scene.snapshot()) });
  console.log(phase + ' ' + spec.name);
}

function probeInstall() {
  window.__selection = { layer: 'full' }; window.__programs = [];
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, ...args) {
    const gl = getContext.call(this, type, ...args); if (type !== 'webgl' || !gl) return gl;
    const p = { createdTextures: 0, deletedTextures: 0, createdBuffers: 0, deletedBuffers: 0, createdPrograms: 0, deletedPrograms: 0, createdShaders: 0, deletedShaders: 0, subUploads: 0, fullUploads: [], lastProjection: {}, pending: [], finiteUploads: true, gl };
    window.__probe = p;
    for (const [create, remove, label] of [['createTexture', 'deleteTexture', 'Textures'], ['createBuffer', 'deleteBuffer', 'Buffers'], ['createProgram', 'deleteProgram', 'Programs'], ['createShader', 'deleteShader', 'Shaders']]) {
      const c = gl[create].bind(gl), d = gl[remove].bind(gl);
      gl[create] = (...args) => { p['created' + label]++; const value = c(...args); if (label === 'Programs') __programs.push(value); return value; };
      gl[remove] = value => { if (value) p['deleted' + label]++; return d(value); };
    }
    const data = gl.bufferData.bind(gl), sub = gl.bufferSubData.bind(gl), draw = gl.drawArrays.bind(gl), use = gl.useProgram.bind(gl);
    gl.bufferData = function(target, values, ...rest) {
      if (values instanceof Float32Array) { p.finiteUploads &&= values.every(Number.isFinite); const record = { floats: values.length }; p.fullUploads.push(record); p.pending.push(crypto.subtle.digest('SHA-256', new Uint8Array(values.buffer, values.byteOffset, values.byteLength)).then(digest => record.hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join(''))); }
      return data(target, values, ...rest);
    };
    gl.bufferSubData = function(target, offset, values, ...rest) { p.subUploads++; if (values instanceof Float32Array) { p.finiteUploads &&= values.every(Number.isFinite); p.lastProjection[offset] = { count: values.length, marker: values[5] }; } return sub(target, offset, values, ...rest); };
    gl.useProgram = program => { __currentProgram = program; return use(program); };
    gl.drawArrays = function(mode, first, count) {
      const s = __selection;
      if (s.layer === 'full') return draw(mode, first, count);
      if (__currentProgram !== __programs[1]) return;
      draw(mode, s.index * 384, 384);
      if (!s.elliptical) {
        draw(mode, (s.models + s.spiralOrdinal) * 384, 384);
        if (__phase === 'candidate') draw(mode, (s.models + s.spiralCount + s.spiralOrdinal) * 384, 384);
      }
    };
    return gl;
  };
}
async function proofs(page) {
  return page.evaluate(async () => {
    const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2, '0')).join('');
    const populations = {}, metadata = {}, functions = {};
    for (const region of ['neighborhood', 'galaxy', 'cosmic']) { const data = __native.models(region); populations[region] = { count: data.points.length / 9, hash: await digest(new Uint8Array(data.points.buffer, data.points.byteOffset, data.points.byteLength)) }; metadata[region] = data.galaxies; }
    for (const [name, fn] of Object.entries(UniverseFlight.math)) functions[name] = await digest(new TextEncoder().encode(fn.toString()));
    const routes = UniverseFlight.flybys(), routeFunctions = [];
    const snapshots = [];
    for (const route of routes) {
      const nativeRoute = __native.route(route.id);
      routeFunctions.push({ id: route.id, region: route.region, durationSeconds: route.durationSeconds, atTime: await digest(new TextEncoder().encode(nativeRoute.atTime.toString())) });
      for (const highlight of route.highlights) {
        __selection = { layer: 'full' }; __scene.set({ mode: 'explore', region: route.region, running: false });
        if (!__scene.startFlyby(route.id) || !__scene.seekFlybyHighlight(highlight.id)) throw new Error('Unavailable route highlight');
        snapshots.push({ route: route.id, highlight: highlight.id, snapshot: __scene.snapshot() });
      }
    }
    await Promise.all(__probe.pending);
    const populationSizes = new Set(Object.values(populations).map(p => p.count * 9));
    const pointUploads = __probe.fullUploads.filter(record => populationSizes.has(record.floats));
    return { populations, metadata, functions, routeFunctions, snapshots, pointUploads, finiteUploads: __probe.finiteUploads };
  });
}

function png(width, height, data) {
  const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; return c >>> 0; });
  const chunk = (type, body) => { const name = Buffer.from(type), payload = Buffer.concat([name, body]), head = Buffer.alloc(4), tail = Buffer.alloc(4); head.writeUInt32BE(body.length); let crc = 0xffffffff; for (const b of payload) crc = table[(crc ^ b) & 255] ^ crc >>> 8; tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0); return Buffer.concat([head, payload, tail]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height); for (let y = 0; y < height; y++) data.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function contactSheet() {
  const tw = 240, th = 160, gap = 4, width = tw * 4 + gap * 3, height = th * 10 + gap * 9, data = Buffer.alloc(width * height * 3, 12);
  cases.forEach((spec, index) => { for (const [phaseIndex, phase] of ['baseline', 'candidate'].entries()) { const image = pixels(images.get(phase + ':' + spec.name)), col = index % 2 * 2 + phaseIndex, row = Math.floor(index / 2); for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const src = (Math.floor(y / th * image.height) * image.width + Math.floor(x / tw * image.width)) * image.channels, dst = ((row * (th + gap) + y) * width + col * (tw + gap) + x) * 3; image.data.copy(data, dst, src, src + 3); } } });
  fs.writeFileSync(path.join(report, 'contact-sheet.png'), png(width, height, data));
  fs.writeFileSync(path.join(report, 'contact-sheet.html'), '<!doctype html><meta charset="utf-8"><title>Disk depth comparison</title><style>body{font:14px system-ui;background:#151515;color:white;margin:16px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}section{display:grid;grid-template-columns:1fr 1fr;gap:4px}h2{grid-column:span 2;font-size:14px;margin:5px}img{width:100%;background:black}small{text-align:center}</style><h1>Tool 57 finite disk depth</h1><p>Baseline left; candidate right. Exact renderer hashes are recorded in check.json.</p><main>' + cases.map(spec => '<section><h2>' + spec.name + '</h2>' + ['baseline','candidate'].map(phase => '<figure style="margin:0"><img src="' + phase + '-' + spec.name + '.png"><figcaption>' + phase + '</figcaption></figure>').join('') + '</section>').join('') + '</main>');
}

(async () => {
  save(); const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const phase of ['baseline', 'candidate']) {
      for (const dpr of [1, 2]) {
        const context = await browser.newContext({ viewport: { width: 720, height: 480 }, deviceScaleFactor: dpr });
        const page = await context.newPage(); page.on('pageerror', error => result.errors.push({ phase, dpr, kind: 'page', error: String(error) })); page.on('console', message => { if (message.type() === 'error') result.errors.push({ phase, dpr, kind: 'console', error: message.text() }); });
        await page.route('http://127.0.0.1:3187/disk-native', route => route.fulfill({ contentType: 'text/html', body: '<style>body{margin:0;background:#000}canvas{display:block;width:720px;height:480px}</style><canvas></canvas>' }));
        await page.goto('http://127.0.0.1:3187/disk-native'); await page.evaluate(phase => window.__phase = phase, phase); await page.evaluate(probeInstall);
        const marker = '  global.UniverseFlight = {'; assert.ok(sources[phase].includes(marker));
        await page.addScriptTag({ content: sources[phase].replace(marker, '  global.__native={models:makeRegion,geometry:galaxyGeometry,route:flybyRoute};\n' + marker) });
        await page.evaluate(() => { window.__scene = UniverseFlight.create(document.querySelector('canvas'), { onStatus(status) { window.__status = status; } }); });
        await page.waitForFunction(() => __status?.state === 'ready');
        for (const spec of cases.filter(spec => spec.dpr === dpr)) await capture(page, phase, spec);
        if (dpr === 1) {
          result.proof[phase] = await proofs(page);
          await pose(page, cases.find(spec => spec.name === 'galaxy-45'));
          const snapshot = await page.evaluate(() => __scene.snapshot()), frozen = await canvasBytes(page), uploads = await page.evaluate(() => __probe.subUploads);
          await page.waitForTimeout(120); assert.equal(sha(await canvasBytes(page)), sha(frozen), phase + ' paused redraw pixels');
          await page.evaluate(() => { __scene.look(.18, .07); __scene.set({ fov: 62, exposure: .8, running: false }); }); await settled(page);
          assert.equal(await page.evaluate(() => __probe.subUploads), uploads, phase + ' look/lens/exposure reuses projection');
          await page.evaluate(snapshot => { if (!__scene.restore(snapshot)) throw new Error('Snapshot restore'); }, snapshot); await settled(page);
          assert.equal(sha(await canvasBytes(page)), sha(frozen), phase + ' exact redraw restore');
          await pose(page, { ...cases[0], inclination: 90 }); const orbit0 = await canvasBytes(page);
          await pose(page, { ...cases[0], inclination: 91 }); const orbit1 = await canvasBytes(page);
          await pose(page, { ...cases[0], inclination: 90 }); assert.equal(sha(await canvasBytes(page)), sha(orbit0), phase + ' orbit return exact pixels');
          result.stability.push({ phase, paused: sha(frozen), orbit90: sha(orbit0), orbit91: sha(orbit1), projectionReusedForLensLook: true, orbitReturnExact: true });
          for (const range of [.001, .01, .04, .08, .20, .40, .60, 1, 2]) { await pose(page, { ...cases[0], name: 'near-fade', range, inclination: 90, fov: 80 }); const bytes = await canvasBytes(page); const projection = await page.evaluate(() => { const s = __selection, offset = (s.models + s.spiralCount + s.spiralOrdinal) * 384 * 6 * 4; return { finiteUploads: __probe.finiteUploads, diskMarker: __probe.lastProjection[offset]?.marker ?? null }; }); result.nearObserver.push({ phase, range, statistics: stats(bytes), ...projection }); if (phase === 'candidate' && range <= .6) assert.equal(projection.diskMarker, -1, 'Near-observer disk emission fades to zero'); }
        }
        await page.evaluate(() => __scene.dispose());
        const resources = await page.evaluate(async () => { await Promise.all(__probe.pending); const { gl, pending, fullUploads, lastProjection, ...counts } = __probe; const errors = []; let code; while ((code = gl.getError()) !== 0) errors.push(code); return { ...counts, errors, lost: gl.isContextLost() }; });
        result.resources.push({ phase, dpr, ...resources });
        for (const label of ['Textures', 'Buffers', 'Programs', 'Shaders']) assert.equal(resources['created' + label], resources['deleted' + label], phase + ' releases ' + label);
        assert.deepEqual(resources.errors, []); assert.equal(resources.lost, false); assert.equal(resources.finiteUploads, true);
        assert.deepEqual([resources.createdTextures, resources.createdBuffers, resources.createdPrograms], [2, 2, 2], phase + ' resource budget');
        await context.close(); save();
      }
    }
    const a = result.proof.baseline, b = result.proof.candidate;
    for (const key of ['populations', 'metadata', 'functions', 'routeFunctions', 'snapshots', 'pointUploads']) assert.deepEqual(b[key], a[key], key + ' preserved');
    assert.equal(a.snapshots.length, 12, 'All twelve authored highlight snapshots');
    for (const spec of cases) {
      assert.deepEqual(result.captures.find(c => c.phase === 'candidate' && c.name === spec.name).snapshot, result.captures.find(c => c.phase === 'baseline' && c.name === spec.name).snapshot, spec.name + ' exact camera snapshot');
      const baseline = stats(images.get('baseline:' + spec.name)), candidate = stats(images.get('candidate:' + spec.name)), delta = difference(images.get('baseline:' + spec.name), images.get('candidate:' + spec.name));
      const comparison = { name: spec.name, baseline, candidate, delta }; result.comparisons.push(comparison);
      if (spec.name.startsWith('elliptical')) assert.equal(sha(images.get('baseline:' + spec.name)), sha(images.get('candidate:' + spec.name)), spec.name + ' exact pixels');
      if (spec.inclination === 0 && !spec.name.startsWith('elliptical')) assert.ok(Math.abs(candidate.sumLuminance / baseline.sumLuminance - 1) < .035, spec.name + ' integrated face-on light within 3.5%');
      if (spec.inclination === 90 && spec.layer === 'target' && !spec.name.startsWith('elliptical') && spec.range >= 3) assert.ok(candidate.outerLuminance > baseline.outerLuminance * 1.015, spec.name + ' outer disk retains emitted edge-on light');
      assert.ok(candidate.clippedFraction < .03, spec.name + ' clipping bound');
    }
    assert.ok(result.nearObserver.every(item => item.finiteUploads && Number.isFinite(item.statistics.sumLuminance) && item.statistics.clippedFraction < .05));
    assert.deepEqual(result.errors, []); contactSheet(); result.completed = true; save();
    console.log(JSON.stringify({ completed: true, savedCaptures: result.captures.length, baseline: baselinePin, candidate: candidatePin, report }, null, 2));
  } catch (error) { result.failure = String(error); save(); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
