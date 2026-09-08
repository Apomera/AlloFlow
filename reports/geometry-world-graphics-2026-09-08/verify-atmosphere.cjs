// Actual browser/WebGL verification of atmosphere and quality transitions.
// Run from the repository root: node reports/geometry-world-graphics-2026-09-08/verify-atmosphere.cjs
const fs = require('node:fs');
let harness = fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs', 'utf8').split('const results =')[0];
harness += String.raw`
(async () => {
  const results = { scope: 'Actual local React/WebGL tool in the existing minimal host, at device pixel ratio 2', checks: {}, errors: [] };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 720 }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => results.errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__geoWorldEngine, {}, { timeout: 120000 });
    await page.getByRole('button', { name: /Free Build Sandbox studio/ }).click();
    await page.getByRole('button', { name: 'Open blank sandbox', exact: true }).click();
    await page.evaluate(() => {
      const en = __geoWorldEngine;
      en._entryAnim = null; en.flyMode = true; en.velocity.set(0, 0, 0); en._ambientMotionEnabled = false;
      en.placeBlock(0, 1, 0, 'brick', 'cube', 0); en.placeBlock(0, 2, 0, 'gold', 'halfA', 0);
      en.camera.position.set(6, 4, 8); en.camera.lookAt(0.5, 2, 0.5); en.euler.setFromQuaternion(en.camera.quaternion); en.camera.updateMatrixWorld(true);
      __ctx.updateMulti('geometryWorld', { autoCycle: false, sandboxDockCollapsed: true, showGameSettings: false });
    });
    await page.waitForFunction(() => !!__geoWorldEngine.composer, {}, { timeout: 45000 });
    results.checks.compositor = await page.evaluate(() => {
      const en = __geoWorldEngine, passes = en.composer.passes;
      const last = passes[passes.length - 1];
      return { passes: passes.length, lastFragment: last.material && last.material.fragmentShader, lastIsShaderPass: last instanceof THREE.ShaderPass, hasScenePass: passes.some(p => p.scene === en.scene), dpr: en.renderer.getPixelRatio(), composerDpr: en.composer._pixelRatio };
    });
    results.checks.compositor.pass = results.checks.compositor.lastIsShaderPass && results.checks.compositor.passes >= 3 && /encodings_fragment|linearToOutputTexel/.test(results.checks.compositor.lastFragment || '');
    delete results.checks.compositor.lastFragment;
    async function openSettings() {
      if (!await page.getByRole('combobox', { name: '3D graphics quality', exact: true }).isVisible()) await page.getByRole('button', { name: 'Open game settings and tools', exact: true }).click();
    }
    const quality = page.getByRole('combobox', { name: '3D graphics quality', exact: true });
    const preset = page.getByRole('combobox', { name: 'Time of day / environment preset', exact: true });
    results.checks.quality = [];
    for (const tier of ['balanced', 'saver', 'detail']) {
      await openSettings(); await quality.selectOption(tier);
      await page.waitForFunction(tier => __geoWorldEngine._renderProfile.tier === tier, tier);
      const state = await page.evaluate(() => { const en = __geoWorldEngine; return { tier: en._renderProfile.tier, rendererDpr: en.renderer.getPixelRatio(), composerDpr: en.composer._pixelRatio, maxPixelRatio: en._renderProfile.maxPixelRatio, shadows: en.renderer.shadowMap.enabled, postFx: en._postFxEnabled }; });
      state.pass = state.rendererDpr === state.composerDpr && state.rendererDpr === state.maxPixelRatio;
      results.checks.quality.push(state);
    }
    results.checks.presets = [];
    for (const name of ['sunset', 'night', 'day']) {
      await openSettings(); await preset.selectOption(name);
      await page.waitForFunction(name => __geoWorldEngine._currentEnv === name && __geoWorldEngine._envDone, name);
      const state = await page.evaluate(() => {
        const en = __geoWorldEngine, uniforms = en._skyDome.material.uniforms;
        const actual = en.sun.position.clone().sub(en.sun.target.position).normalize();
        const shader = uniforms.sunDir.value.clone().normalize();
        const disc = en._sunSprite.position.clone().sub(en.camera.position).normalize(); return { name: en._currentEnv, actualSun: actual.toArray(), skySun: shader.toArray(), agreement: actual.dot(shader), sunSpriteAgreement: actual.dot(disc), sunIntensity: en.sun.intensity, sky: en.scene.background.toArray(), fog: en.scene.fog.color.toArray(), near: en.scene.fog.near, far: en.scene.fog.far, skyUsesOutputEncoding: /encodings_fragment|linearToOutputTexel/.test(en._skyDome.material.fragmentShader) };
      });
      state.pass = state.agreement > 0.99999 && state.sunSpriteAgreement > 0.99999 && state.near >= 0 && state.far > state.near && state.sky.concat(state.fog).every(Number.isFinite) && state.skyUsesOutputEncoding;
      results.checks.presets.push(state);
      await page.getByRole('button', { name: 'Close game settings and tools', exact: true }).click();
      await page.screenshot({ path: path.join(out, 'atmosphere-' + name + '.png') });
    }
    // Render the exact same scene through both paths without advancing simulation,
    // and read pixels synchronously before the browser can clear its drawing buffer.
    results.checks.colorParity = await page.evaluate(() => {
      const en = __geoWorldEngine, gl = en.renderer.getContext(), canvas = en.renderer.domElement;
      const sample = () => [[0.15,0.88],[0.3,0.88],[0.5,0.88],[0.7,0.88],[0.85,0.88]].map(([x,y]) => {
        const rgba = new Uint8Array(4); gl.readPixels(Math.floor(canvas.width*x), Math.floor(canvas.height*y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba); return Array.from(rgba);
      });
      en.renderer.setRenderTarget(null); en.renderer.render(en.scene, en.camera); const direct = sample();
      const oldReset = en.renderer.info.autoReset; en.renderer.info.autoReset = false; en.renderer.info.reset(); en.composer.render(); const composed = sample();
      const frame = { calls: en.renderer.info.render.calls, triangles: en.renderer.info.render.triangles, lines: en.renderer.info.render.lines, textures: en.renderer.info.memory.textures };
      en.renderer.info.autoReset = oldReset;
      const deltas = direct.map((color, index) => Math.max(...color.slice(0,3).map((channel, c) => Math.abs(channel-composed[index][c]))));
      return { direct, composed, maxChannelDeltas: deltas, medianDelta: deltas.slice().sort((a,b)=>a-b)[2], wholeFrame: frame, pass: deltas.slice().sort((a,b)=>a-b)[2] <= 18 };
    });
    results.checks.lessonReset = await page.evaluate(() => {
      const en = __geoWorldEngine;
      en.loadLesson(StemLab.geometryWorldBuilderPure.FREE_BUILD_LESSON); en._entryAnim = null;
      return { currentEnvironment: en._currentEnv, sky: en.scene.background.toArray(), fog: en.scene.fog.color.toArray(), sunIntensity: en.sun.intensity, transitionComplete: en._envDone };
    });
    results.checks.lessonReset.pass = results.checks.lessonReset.currentEnvironment === 'day' && results.checks.lessonReset.transitionComplete && results.checks.lessonReset.sky.some((v, i) => Math.abs(v-results.checks.lessonReset.fog[i]) > 0.01);
    results.checks.shaders = await page.evaluate(() => ({ errors: (__geoWorldEngine.renderer.info.programs || []).filter(program => program.diagnostics && program.diagnostics.runnable === false).map(program => program.diagnostics) }));
    results.checks.shaders.pass = results.checks.shaders.errors.length === 0;
    results.passed = !results.errors.length && Object.values(results.checks).every(value => Array.isArray(value) ? value.every(item => item.pass) : value.pass);
    if (!results.passed) process.exitCode = 1;
  } catch (error) {
    results.failure = error.stack; results.passed = false; process.exitCode = 1;
    await page.screenshot({ path: path.join(out, 'atmosphere-failure.png') }).catch(() => {});
  } finally {
    fs.writeFileSync(path.join(out, 'atmosphere-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ passed: results.passed, failure: results.failure, errors: results.errors, checks: Object.fromEntries(Object.entries(results.checks).map(([key, value]) => [key, Array.isArray(value) ? value.map(item => ({ name: item.name || item.tier, pass: item.pass })) : { pass: value.pass }])) }, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})();
`;
eval(harness);
