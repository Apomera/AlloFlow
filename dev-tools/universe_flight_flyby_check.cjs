const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = process.env.UNIVERSE_REPO || path.resolve(__dirname, '..');
const report = process.env.UNIVERSE_FLYBY_REPORT || path.join(repo, 'reports/universe-flight-2026-09-29');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const sourceFile = path.join(repo, 'stem_lab/universe_flight_scene.js');
const uiFile = path.join(repo, 'stem_lab/stem_tool_universe.js');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const result = { sourceHash: hash(fs.readFileSync(sourceFile)), uiHash: hash(fs.readFileSync(uiFile)), completed: false, checks: [], captures: [], errors: [], graphics: [], accessibility: [], layouts: [], progressSamples: [] };
fs.mkdirSync(report, { recursive: true });
const save = () => fs.writeFileSync(path.join(report, 'flyby-check.json'), JSON.stringify(result, null, 2));

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
  let count = 0, sum = 0, clipped = 0, luminous = 0, max = 0;
  for (let y = 0; y < image.height; y += 3) for (let x = 0; x < image.width; x += 3) {
    const i = (y * image.width + x) * image.channels, r = image.pixels[i], g = image.pixels[i + 1], b = image.pixels[i + 2], level = .2126 * r + .7152 * g + .0722 * b;
    count++; sum += level; max = Math.max(max, r, g, b); if (level > 8) luminous++; if (Math.min(r, g, b) >= 250) clipped++;
  }
  return { mean: sum / count, clippedWhiteFraction: clipped / count, luminousFraction: luminous / count, max };
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

(async () => {
  save();
  const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('response', async response => {
      if (/\/stem_lab\/(universe_flight_scene|stem_tool_universe)\.js(?:\?|$)/.test(response.url())) {
        try { const entry = { url: response.url(), status: response.status(), hash: hash(await response.body()) }; result.served = result.served || []; result.served.push(entry); }
        catch (error) { result.errors.push('Cannot read served runtime: ' + error); }
      }
    });
    await page.addInitScript(() => {
      window.__flybyGL = []; window.__flybyScenes = []; window.__flybyPauses = []; window.__flybyLaunches = []; window.__flybySamples = [];
      const context = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        const gl = context.call(this, type, ...args); if (type !== 'webgl' || !gl || gl.__flybyProbe) return gl;
        gl.__flybyProbe = true;
        const record = { created: 0, deleted: 0, textures: [], shaders: [], pointUploads: [] };
        window.__flybyGL.push({ gl, record });
        const data = gl.bufferData.bind(gl), shader = gl.shaderSource.bind(gl), create = gl.createTexture.bind(gl), remove = gl.deleteTexture.bind(gl);
        gl.bufferData = function (target, values, ...rest) { if (values instanceof Float32Array && values.length > 9000 && values.length % 9 === 0) record.pointUploads.push(Array.from(new Uint8Array(values.buffer, values.byteOffset, values.byteLength))); return data(target, values, ...rest); };
        gl.shaderSource = function (object, text) { record.shaders.push(text); return shader(object, text); };
        gl.createTexture = function () { const texture = create(); record.created++; record.textures.push(texture); return texture; };
        gl.deleteTexture = function (texture) { if (texture) record.deleted++; return remove(texture); };
        return gl;
      };
      let api;
      Object.defineProperty(window, 'UniverseFlight', { configurable: true, get() { return api; }, set(value) {
        const create = value.create;
        value.create = function (canvas, options) {
          const telemetry = options.onTelemetry, status = options.onStatus, pause = options.onPause;
          const scene = create.call(this, canvas, Object.assign({}, options, {
            onTelemetry(info) { window.__flybyInfo = info; if (info.flyby?.active) window.__flybySamples.push({ progress: info.flyby.progress, elapsedSeconds: info.flyby.elapsedSeconds, position: info.position, state: info.state }); if (telemetry) telemetry(info); },
            onStatus(info) { window.__flybyStatus = info; if (status) status(info); },
            onPause(message, detail) { window.__flybyPauses.push({ message, detail: detail ? JSON.parse(JSON.stringify(detail)) : null }); if (pause) pause(message, detail); }
          }));
          const launch = scene.startFlyby;
          if (launch) scene.startFlyby = function (...args) { const entry = { args, before: scene.snapshot() }; entry.accepted = launch.apply(this, args); entry.after = scene.snapshot(); entry.flyby = window.__flybyInfo?.flyby ? JSON.parse(JSON.stringify(window.__flybyInfo.flyby)) : null; window.__flybyLaunches.push(entry); return entry.accepted; };
          window.__flybyScene = scene; window.__flybyCanvas = canvas; window.__flybyScenes.push(scene); return scene;
        }; api = value;
      } });
    });
    await page.goto(process.env.UNIVERSE_FLYBY_URL || 'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?flyby=qa');
    await page.waitForFunction(() => window.__flybyScene && window.__flybyStatus?.state === 'ready');
    await page.addScriptTag({ path: path.join(repo, 'node_modules/axe-core/axe.min.js') });
    const stage = page.locator('.uf-stage'), canvas = stage.locator('canvas'), panel = stage.locator('#uf-inview-controls');
    const next = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const snapshot = () => page.evaluate(() => window.__flybyScene.snapshot());
    const info = () => page.evaluate(() => window.__flybyInfo);
    const check = text => { result.checks.push(text); save(); };
    async function enter() { await page.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await page.waitForFunction(() => !!document.fullscreenElement); }
    async function exit() { if (await page.evaluate(() => !!document.fullscreenElement)) { await stage.getByRole('button', { name: 'Toggle full screen for the 3D view', exact: true }).click(); await page.waitForFunction(() => !document.fullscreenElement); } }
    async function open(section = 'explore') { if (!await panel.count()) await stage.locator('#uf-flight-controls-toggle').click(); await panel.locator('#uf-inview-tab-' + section).click(); await panel.locator('#uf-inview-panel-' + section).waitFor({ state: 'visible' }); await next(); }
    async function close() { if (await panel.count()) await panel.getByRole('button', { name: 'Close flight controls', exact: true }).click(); await page.waitForFunction(() => !document.querySelector('#uf-inview-controls')); }
    async function focusedCanvas() { await page.waitForFunction(() => document.activeElement === window.__flybyCanvas); }
    async function pause() { if ((await info()).running) { await canvas.focus(); await canvas.press('Space'); } await page.waitForFunction(() => window.__flybyInfo?.running === false); await next(); return snapshot(); }
    async function play() { await canvas.focus(); await canvas.press('Space'); await page.waitForFunction(() => window.__flybyInfo?.running === true); }
    async function axeScope(name, node = stage) { const violations = await node.evaluate(async node => { const result = await axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); return result.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })); }); result.accessibility.push({ name, violations }); assert.deepEqual(violations, [], name + ' passes scoped accessibility'); save(); }
    async function capture(name) {
      const actual = await page.evaluate(() => window.__flybyScene.capture()); assert.ok(actual?.dataUrl.startsWith('data:image/png;base64,'));
      const buffer = Buffer.from(actual.dataUrl.split(',')[1], 'base64'), image = png(buffer), stats = statistics(image); assert.ok(stats.max > 32);
      fs.writeFileSync(path.join(report, 'flyby-' + name + '.png'), buffer);
      const errors = await page.evaluate(() => window.__flybyGL.map(({ gl }) => gl.getError())); assert.ok(errors.every(code => code === 0));
      result.graphics.push({ name, errors }); result.captures.push({ name, width: image.width, height: image.height, pixelHash: hash(image.pixels), stats, snapshot: actual.snapshot, flyby: (await info()).flyby }); save(); console.log('Captured flyby-' + name + '.png'); return image;
    }
    async function launch({ fullscreen = false } = {}) {
      if (fullscreen) await open();
      const button = (fullscreen ? panel.locator('#uf-inview-scenic-flights') : page.locator('#uf-scenic-flights')).locator('[data-scenic-flight="halo"]');
      await button.focus(); await button.press('Enter');
      await page.waitForFunction(() => window.__flybyInfo?.flyby?.active && window.__flybyInfo.running);
      await focusedCanvas(); assert.equal(await panel.count(), 0); await pause();
      const fresh = await snapshot(), launch = await page.evaluate(() => window.__flybyLaunches.at(-1));
      assert.equal(launch.accepted, true); assert.equal(fresh.settings.mode, 'explore'); assert.equal(fresh.settings.region, 'galaxy');
      for (const key of ['distanceLy', 'universeYears', 'travelerYears']) assert.equal(launch.after.state[key], 0, 'Fresh launch resets ' + key);
      assert.equal((await info()).motion.kind, 'flyby'); assert.equal((await info()).flyby.autoLook, true);
      result.launches = result.launches || []; result.launches.push(launch); return fresh;
    }
    async function rate(value, { fullscreen = false } = {}) {
      if (fullscreen) await open();
      await page.locator(fullscreen ? '#uf-inview-flyby-rate' : '#uf-flyby-rate').selectOption(String(value));
      await page.waitForFunction(value => window.__flybyInfo?.flyby?.rate === value, value); await next();
    }
    async function milestone(progress, name) {
      if ((await info()).flyby.progress < progress) { await play(); await page.waitForFunction(progress => window.__flybyInfo?.flyby?.progress >= progress, progress, { timeout: 90000 }); await pause(); }
      const current = await info(); assert.ok(current.flyby.progress >= progress && current.flyby.progress < 1);
      const saved = await snapshot(); result.progressSamples.push({ name, flyby: current.flyby, position: saved.state.position, distanceLy: saved.state.distanceLy }); return capture(name);
    }
    async function stable(name) {
      const saved = await pause(), frozen = (await info()).flyby, first = await capture(name);
      await page.waitForTimeout(220); const second = await page.evaluate(() => window.__flybyScene.capture());
      assert.deepEqual(png(Buffer.from(second.dataUrl.split(',')[1], 'base64')).pixels, first.pixels); assert.deepEqual(second.snapshot, saved); assert.deepEqual((await info()).flyby, frozen); return first;
    }

    const catalog = await page.evaluate(() => ({ flybys: UniverseFlight.flybys(), landmarks: ['neighborhood', 'galaxy', 'cosmic'].flatMap(region => UniverseFlight.landmarks(region)), galaxy: UniverseFlight.landmarks('galaxy') }));
    assert.equal(catalog.landmarks.length, 18); assert.equal(catalog.galaxy.filter(item => /^halo-cluster-[1-6]$/.test(item.id)).length, 6);
    for (const cluster of catalog.galaxy.filter(item => /^halo-cluster/.test(item.id))) assert.equal(cluster.arrivalRadiusLy, 600);
    assert.ok(catalog.flybys.some(item => item.id === 'halo')); result.catalog = catalog;
    check('Halo route metadata and all six generated star clusters are selectable');

    // Native launch from the normal UI, then use the real fullscreen renderer throughout.
    await page.getByRole('button', { name: 'Einstein’s light chase', exact: true }).click();
    await page.getByRole('button', { name: 'Free exploration', exact: true }).click();
    await page.evaluate(() => { const scene = window.__flybyScene, saved = scene.snapshot(); Object.assign(saved.state, { distanceLy: 123, universeYears: 45, travelerYears: 12 }); scene.restore(saved); });
    const before = await snapshot(); await launch(); const normalStart = await snapshot();
    assert.equal(normalStart.settings.beta, before.settings.beta); assert.equal(normalStart.settings.quality, before.settings.quality);
    await enter(); const startImage = await stable('start'); check('normal keyboard launch starts Free exploration, resets the journey, and keeps physics and quality preferences');
    await rate(2, { fullscreen: true }); await axeScope('desktop-paused-controls'); await close();
    const approach = await milestone(.20, 'arm-skim');
    await milestone(.33, 'cluster-approach');
    const clusterImage = await milestone(.50, 'cluster-pass'); await stable('cluster-paused');
    const near = await snapshot(), nearInfo = await info(), cluster = catalog.galaxy.find(item => item.id === 'halo-cluster-2');
    result.clusterPass = { separationLy: Math.hypot(...near.state.position.map((value, i) => value - cluster.position[i])), progress: nearInfo.flyby.progress };
    const changed = difference(startImage, clusterImage); assert.ok(changed.changedFraction > .005 && changed.meanAbsolute > .1); result.travelDifference = changed;
    check('the real curved flyby visibly traverses the galaxy and the paused cluster pass freezes both pixels and elapsed travel');

    const manualBefore = await snapshot(); await canvas.focus(); await canvas.press('ArrowRight'); await canvas.press('ArrowUp'); await next();
    const manual = await snapshot(); assert.notEqual(manual.state.yaw, manualBefore.state.yaw); assert.notEqual(manual.state.pitch, manualBefore.state.pitch); assert.deepEqual(manual.state.position, manualBefore.state.position); assert.equal((await info()).flyby.autoLook, false);
    const manualProgress = (await info()).flyby.progress; await play(); await page.waitForFunction(progress => window.__flybyInfo.flyby.progress > progress + .015, manualProgress, { timeout: 30000 }); await pause();
    const movedManual = await snapshot(); assert.equal(movedManual.state.yaw, manual.state.yaw); assert.equal(movedManual.state.pitch, manual.state.pitch); assert.notDeepEqual(movedManual.state.position, manual.state.position); await capture('manual-look');
    await open(); await panel.locator('#uf-inview-flyby-follow').focus(); await panel.locator('#uf-inview-flyby-follow').press('Enter'); await page.waitForFunction(() => window.__flybyInfo.flyby.autoLook); await close(); await capture('follow-restored');
    check('native free look keeps the authored route moving with independent gaze, and Follow flyby view restores the camera aim');
    await rate(.5, { fullscreen: true }); assert.equal((await info()).flyby.rate, .5); await close(); await rate(2, { fullscreen: true }); await close();
    check('native Slow and Fast pacing controls change the real flyby rate without changing physics');
    const reveal = await milestone(.80, 'galaxy-reveal'), revealDifference = difference(clusterImage, reveal); assert.ok(revealDifference.changedFraction > .005); result.revealDifference = revealDifference;
    const stopsBefore = await page.evaluate(() => window.__flybyPauses.filter(item => item.detail?.kind === 'flyby').length); await play();
    await page.waitForFunction(() => window.__flybyInfo?.flyby?.completed && !window.__flybyInfo.running, {}, { timeout: 90000 });
    const finish = await stable('completed'), finishInfo = await info(), finished = await snapshot();
    assert.equal(finishInfo.flyby.progress, 1); assert.equal(finishInfo.motion.paceLyPerSecond, 0); assert.equal(finished.targetId, 'galactic-center');
    assert.equal(finished.state.universeYears, 0); assert.equal(finished.state.travelerYears, 0);
    const stopEvents = await page.evaluate(() => window.__flybyPauses.filter(item => item.detail?.kind === 'flyby')); assert.equal(stopEvents.length, stopsBefore + 1); result.completion = { snapshot: finished, info: finishInfo, event: stopEvents.at(-1) };
    await stage.locator('#uf-stage-journey').waitFor({ state: 'visible' }); assert.ok((await stage.locator('#uf-stage-journey').innerText()).includes('Halo flyby complete')); await stage.screenshot({ path: path.join(report, 'flyby-completed-ui.png') }); await axeScope('desktop-completion');
    check('the renderer completes once, pauses at the final galaxy reveal, and presents a real journey checkpoint');

    await open(); const completeControls = panel.locator('#uf-inview-flyby-status'); assert.equal(await completeControls.getAttribute('data-flyby-state'), 'completed');
    assert.equal(await panel.locator('#uf-inview-flyby-rate').isDisabled(), true); assert.equal(await panel.locator('#uf-inview-flyby-follow').isDisabled(), true);
    const replay = completeControls.locator('[data-flyby-replay="halo"]'); await replay.focus(); await replay.press('Enter'); await page.waitForFunction(() => window.__flybyInfo.flyby.active && window.__flybyInfo.running); await focusedCanvas(); await pause();
    const replayLaunch = await page.evaluate(() => window.__flybyLaunches.at(-1));
    assert.equal(replayLaunch.accepted, true); assert.deepEqual(replayLaunch.args, ['halo']);
    assert.deepEqual(replayLaunch.after.state.position, catalog.flybys.find(item => item.id === 'halo').position); assert.equal(replayLaunch.after.targetId, 'halo-cluster-2');
    for (const key of ['distanceLy', 'universeYears', 'travelerYears']) assert.equal(replayLaunch.after.state[key], 0);
    assert.equal(replayLaunch.flyby.id, 'halo'); assert.equal(replayLaunch.flyby.active, true); assert.equal(replayLaunch.flyby.progress, 0); assert.equal(replayLaunch.flyby.elapsedSeconds, 0);
    result.replayLaunch = replayLaunch; check('completed controls expose a native Replay flyby action that begins at the exact authored route start with zero elapsed travel');

    // Cancellation and public snapshot restore must stop route motion, not leave a hidden timer running.
    await open(); await panel.locator('#uf-inview-mode').selectOption('relativity'); await page.waitForFunction(() => window.__flybyScene.snapshot().settings.mode === 'relativity');
    await launch({ fullscreen: true }); assert.equal((await snapshot()).settings.mode, 'explore'); check('fullscreen keyboard launch explicitly switches Einstein’s light chase to Free exploration');
    await rate(2, { fullscreen: true }); await close(); await milestone(.05, 'cancel-before');
    await open(); await panel.locator('#uf-inview-flyby-cancel').focus(); await panel.locator('#uf-inview-flyby-cancel').press('Enter'); await page.waitForFunction(() => !window.__flybyInfo.flyby.active && !window.__flybyInfo.running); await close();
    const canceled = await snapshot(); await page.waitForTimeout(180); assert.deepEqual(await snapshot(), canceled); result.canceled = { snapshot: canceled, flyby: (await info()).flyby };
    check('ending the flyby from its native controls pauses the real camera and clears the route');
    await launch({ fullscreen: true }); const saved = await snapshot(); await play(); await page.waitForFunction(() => window.__flybyInfo.flyby.progress > .02); await pause();
    assert.equal(await page.evaluate(saved => window.__flybyScene.restore(saved), saved), true); await next(); assert.equal((await info()).flyby.active, false); assert.equal((await info()).running, false); assert.deepEqual((await snapshot()).state.position, saved.state.position);
    check('restoring an ordinary saved view clears the flyby and always returns paused');

    // The new targets use the existing approach/orbit machinery and true world-space distances.
    const approachStart = cluster.position.map((v, i) => v + (i === 0 ? 3000 : 0));
    await page.evaluate(({ position }) => { const saved = window.__flybyScene.snapshot(); Object.assign(saved.settings, { mode: 'explore', region: 'galaxy', fov: 50 }); Object.assign(saved.state, { position, distanceLy: 0 }); saved.targetId = null; window.__flybyScene.restore(saved); }, { position: approachStart });
    await open('travel'); const clusterPace = panel.locator('#uf-inview-speed'); await clusterPace.focus(); await clusterPace.press('End');
    await page.waitForFunction(() => window.__flybyInfo.motion.targetLyPerSecond === 30000);
    await open(); await panel.locator('#uf-inview-destination').selectOption('halo-cluster-2'); await panel.locator('#uf-inview-arrival').selectOption('1');
    const approachButton = panel.locator('.uf-inview-destination-actions').getByRole('button', { name: 'Fly to destination', exact: true }); await approachButton.focus(); await approachButton.press('Enter');
    await page.waitForFunction(() => window.__flybyInfo.navigation.completed && !window.__flybyInfo.running, {}, { timeout: 30000 });
    const arrived = await snapshot(), separation = Math.hypot(...arrived.state.position.map((v, i) => v - cluster.position[i])); assert.ok(Math.abs(separation - 600) < 1e-6); await capture('cluster-arrival');
    await open(); const orbitButton = panel.locator('.uf-inview-destination-actions').getByRole('button', { name: 'Orbit destination', exact: true }); await orbitButton.focus(); await orbitButton.press('Enter');
    await page.waitForFunction(position => Math.hypot(...window.__flybyScene.snapshot().state.position.map((v, i) => v - position[i])) > 15, arrived.state.position, { timeout: 30000 }); await pause();
    const orbited = await snapshot(), orbitRadius = Math.hypot(...orbited.state.position.map((v, i) => v - cluster.position[i])); assert.ok(Math.abs(orbitRadius - 600) < 1e-6); await capture('cluster-orbit'); result.clusterNavigation = { separation, orbitRadius };
    check('the halo cluster approach pauses at its actual 600 ly viewing radius and orbit retains that radius');

    const baseline = JSON.parse(fs.readFileSync(path.join(report, 'depth-refined.json'), 'utf8')); assert.equal(baseline.completed, true);
    const uploaded = await page.evaluate(() => window.__flybyGL[0].record.pointUploads);
    const galaxyBytes = Buffer.from(uploaded.find(bytes => bytes.length === 36400 * 36)); assert.ok(galaxyBytes.length); result.pointHash = hash(galaxyBytes); assert.equal(result.pointHash, baseline.regions.galaxy.hash);
    const shaders = await page.evaluate(() => window.__flybyGL[0].record.shaders);
    result.shaderHash = hash(JSON.stringify(shaders)); result.projectedShaderHash = hash(JSON.stringify(projectCloudDetailShaders(shaders))); assert.equal(result.projectedShaderHash, baseline.shaderHash);
    result.math = await page.evaluate(() => ({ gamma: UniverseFlight.math.gamma(.99), aberrate: UniverseFlight.math.aberrate([.4, -.2, .7], .99), spectrum: UniverseFlight.math.viewSpectrum(.99, .3, -.2, 550), clock: UniverseFlight.math.lightClock(.99, 1) })); assert.deepEqual(result.math, baseline.math);
    check('galaxy point bytes and special relativity math match enhanced 23; only the three accepted cloud-detail shader changes differ');

    // Dispose through the real tool UI, reopen, then launch through the new route again.
    await exit(); await page.getByRole('button', { name: 'Close flight explorer', exact: true }).click(); await page.waitForFunction(() => !document.querySelector('.uf-stage'));
    result.disposal = await page.evaluate(() => window.__flybyGL.map(({ gl, record }) => ({ created: record.created, deleted: record.deleted, live: record.textures.filter(texture => gl.isTexture(texture)).length })));
    assert.ok(result.disposal.every(record => record.created === 2 && record.deleted === 2 && record.live === 0));
    await page.getByRole('button', { name: 'Open 3D flight', exact: true }).click(); await page.waitForFunction(() => window.__flybyScenes.length === 2 && window.__flybyStatus?.state === 'ready');
    await launch(); await rate(.5); assert.equal((await info()).flyby.rate, .5);
    await page.locator('#uf-flyby-cancel').focus(); await page.locator('#uf-flyby-cancel').press('Enter'); await page.waitForFunction(() => !window.__flybyInfo.flyby.active && !window.__flybyInfo.running);
    await launch(); await enter(); await capture('reopened-start');
    const newResources = await page.evaluate(() => { const { gl, record } = window.__flybyGL.at(-1); return { created: record.created, deleted: record.deleted, live: record.textures.filter(texture => gl.isTexture(texture)).length }; }); assert.deepEqual(newResources, { created: 2, deleted: 0, live: 2 }); result.reopenedResources = newResources;
    check('closing releases both textures and reopening starts a working flyby with native normal pace/end controls and the same resource count');

    for (const viewport of [{ width: 320, height: 740 }, { width: 568, height: 320 }]) {
      await exit(); await page.setViewportSize(viewport); await next(); const name = viewport.width === 320 ? 'phone' : 'landscape';
      const normal = page.locator('#uf-scenic-flights'); assert.ok(await normal.evaluate(node => node.scrollWidth <= node.clientWidth + 1)); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const launchButton = normal.locator('[data-scenic-flight="halo"]'); await launchButton.scrollIntoViewIfNeeded(); const box = await launchButton.boundingBox(); assert.ok(box && box.width > 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= viewport.width + 1);
      await normal.screenshot({ path: path.join(report, 'flyby-' + name + '-launcher.png') }); await axeScope(name + '-normal-launcher', normal); await launch(); await enter();
      await open(); const fullscreenLaunch = panel.locator('#uf-inview-scenic-flights'); await axeScope(name + '-fullscreen-controls');
      await fullscreenLaunch.locator('[data-scenic-flight="halo"]').scrollIntoViewIfNeeded(); const fullscreenBox = await fullscreenLaunch.locator('[data-scenic-flight="halo"]').boundingBox(), shell = await panel.boundingBox(); assert.ok(fullscreenBox.height >= 44 && fullscreenBox.x >= 0 && fullscreenBox.x + fullscreenBox.width <= viewport.width + 1); assert.ok(shell.x >= 0 && shell.y >= 0 && shell.x + shell.width <= viewport.width + 1 && shell.y + shell.height <= viewport.height + 1);
      await stage.screenshot({ path: path.join(report, 'flyby-' + name + '-controls.png') }); await launch({ fullscreen: true }); await rate(.5, { fullscreen: true }); await close(); await capture(name + '-fullscreen-start');
      await open(); await panel.locator('#uf-inview-flyby-cancel').focus(); await panel.locator('#uf-inview-flyby-cancel').press('Enter'); await page.waitForFunction(() => !window.__flybyInfo.flyby.active); await close(); await focusedCanvas();
      result.layouts.push({ name, viewport, box, fullscreenBox, shell }); check(name + ' normal/fullscreen native keyboard launches, pace controls, and end controls remain reachable without overflow');
    }
    result.progressSamples = result.progressSamples.concat(await page.evaluate(() => window.__flybySamples));
    const nearSamples = result.progressSamples.filter(sample => sample.position && sample.progress > .2 && sample.progress < .8);
    result.closestObservedClusterLy = Math.min(...nearSamples.map(sample => Math.hypot(...sample.position.map((value, i) => value - cluster.position[i]))));
    assert.ok(result.closestObservedClusterLy >= 600 && result.closestObservedClusterLy < 1300, 'The actual route passes near the cluster without entering its member envelope');
    assert.deepEqual(result.errors, []); assert.equal(hash(fs.readFileSync(sourceFile)), result.sourceHash); assert.equal(hash(fs.readFileSync(uiFile)), result.uiHash);
    const servedSource = result.served.find(entry => /universe_flight_scene\.js/.test(entry.url)), servedUI = result.served.find(entry => /stem_tool_universe\.js/.test(entry.url)); assert.equal(servedSource?.status, 200); assert.equal(servedSource?.hash, result.sourceHash); assert.equal(servedUI?.status, 200); assert.equal(servedUI?.hash, result.uiHash);
    result.completed = true; save(); console.log('Halo flyby passed: ' + result.checks.length + ' groups, ' + result.accessibility.length + ' accessibility scopes, ' + result.captures.length + ' actual captures; source ' + result.sourceHash + '.');
  } catch (error) { result.failure = String(error); save(); throw error; } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
