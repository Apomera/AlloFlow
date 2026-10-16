/* Standalone, dependency-free contract checks; does not claim GPU compilation. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const THREE = require(path.join(root, 'vendor/three-r128/three.min.js'));
const code = fs.readFileSync(path.join(__dirname, 'skyschool-city-facade.js'), 'utf8');
const context = {}; vm.createContext(context); vm.runInContext(code, context);
const attach = context.attachFlightCityFacade;
const shader = () => ({ vertexShader: THREE.ShaderLib.lambert.vertexShader, fragmentShader: THREE.ShaderLib.lambert.fragmentShader });
const results = [];
function check(name, run) { run(); results.push(name); }
check('invalid and non-Lambert materials pass through', () => {
  assert.equal(attach(null, THREE), null);
  const plain = new THREE.MeshBasicMaterial(); const hook = plain.onBeforeCompile;
  assert.equal(attach(plain, THREE), plain); assert.equal(plain.onBeforeCompile, hook);
});
check('r128 Lambert patch is complete and enables derivatives', () => {
  const material = new THREE.MeshLambertMaterial(); attach(material, THREE);
  const output = shader(); material.onBeforeCompile(output, {});
  assert.equal(material.userData.flightCityFacade.patched, true);
  assert.equal(material.extensions.derivatives, true);
  assert.ok(output.vertexShader.includes('vec4(flightFacadeLocal.xyz, 0.0)'));
  assert.ok(output.vertexShader.includes('inverseTransformDirection(transformedNormal, viewMatrix)'));
  assert.ok(output.fragmentShader.includes('fwidth(flightFacadeUV)'));
  assert.ok(output.fragmentShader.includes('vFlightFacadeDepth'));
  assert.ok(output.fragmentShader.includes('totalEmissiveRadiance *= flightFacadeLight * flightFacadeWall;'));
  assert.equal((output.vertexShader.match(/varying vec3 vFlightFacadePosition/g) || []).length, 1);
  assert.equal((output.fragmentShader.match(/varying vec3 vFlightFacadePosition/g) || []).length, 1);
});
check('attachment is idempotent and preserves existing material data', () => {
  const material = new THREE.MeshLambertMaterial(); material.userData.existing = 42;
  material.extensions = { drawBuffers: true }; attach(material, THREE);
  const hook = material.onBeforeCompile, key = material.customProgramCacheKey();
  const version = material.version; attach(material, THREE);
  assert.equal(material.onBeforeCompile, hook); assert.equal(material.customProgramCacheKey(), key);
  assert.equal(material.version, version); assert.equal(material.userData.existing, 42);
  assert.equal(material.extensions.drawBuffers, true);
});
check('existing compile hooks and dynamic program keys still run', () => {
  const material = new THREE.MeshLambertMaterial(); let calls = 0;
  material.userData.variant = 'a';
  material.onBeforeCompile = function(output, renderer) { calls++; assert.equal(this, material); assert.equal(renderer.test, true); output.fragmentShader += '\n// earlier hook'; };
  material.customProgramCacheKey = function() { return 'custom-' + this.userData.variant; };
  attach(material, THREE); const output = shader(); material.onBeforeCompile(output, { test: true });
  assert.equal(calls, 1); assert.ok(output.fragmentShader.includes('// earlier hook'));
  assert.equal(material.customProgramCacheKey(), 'custom-a|flight-city-facade:v3');
  material.userData.variant = 'b'; assert.equal(material.customProgramCacheKey(), 'custom-b|flight-city-facade:v3');
});
check('incompatible shaders keep both stages intact', () => {
  const material = new THREE.MeshLambertMaterial(); attach(material, THREE);
  const output = shader(); output.fragmentShader = 'void main() {}';
  const before = { ...output }; material.onBeforeCompile(output, {});
  assert.equal(output.vertexShader, before.vertexShader); assert.equal(output.fragmentShader, before.fragmentShader);
  assert.equal(material.userData.flightCityFacade.reason, 'unsupported-shader-chunks');
  assert.equal(material.userData.flightCityFacade.patched, false);
});
check('cloned material can be attached despite copied diagnostic metadata', () => {
  const material = new THREE.MeshLambertMaterial(); attach(material, THREE);
  const clone = material.clone(); attach(clone, THREE);
  const output = shader(); clone.onBeforeCompile(output, {});
  assert.ok(output.fragmentShader.includes('flightFacadeLight'));
  assert.equal(clone.userData.flightCityFacade.patched, true);
});
check('world-foot coordinates preserve scales and ignore floating-origin translation', () => {
  const model = new THREE.Matrix4().compose(new THREE.Vector3(120000, 300, -70000), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.3), new THREE.Vector3(120, 240, 80));
  const bottom = new THREE.Vector4(0, 0, 0, 0).applyMatrix4(model);
  const top = new THREE.Vector4(0, 1, 0, 0).applyMatrix4(model);
  assert.equal(top.y - bottom.y, 240);
  const horizontal = new THREE.Vector4(1, 0, 0, 0).applyMatrix4(model);
  assert.ok(Math.abs(Math.hypot(horizontal.x, horizontal.z) - 120) < 1e-10);
  const prior = horizontal.clone(); model.setPosition(new THREE.Vector3(-220000, -200, 300000));
  assert.deepEqual(new THREE.Vector4(1, 0, 0, 0).applyMatrix4(model).toArray(), prior.toArray());
  const merged = new THREE.Vector4(120, 240, 80, 0).applyMatrix4(new THREE.Matrix4().makeTranslation(6000, 20, 8000));
  assert.deepEqual(merged.toArray(), [120, 240, 80, 0]);
});
check('normal-space path handles scaled rotated walls and roofs', () => {
  const model = new THREE.Matrix4().makeRotationY(0.45).scale(new THREE.Vector3(100, 250, 60));
  const camera = new THREE.Matrix4().makeRotationX(0.35);
  const modelView = new THREE.Matrix4().multiplyMatrices(camera, model);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(modelView);
  const inverseCamera = camera.clone().invert();
  const roof = new THREE.Vector3(0, 1, 0).applyMatrix3(normalMatrix).transformDirection(inverseCamera);
  const wall = new THREE.Vector3(1, 0, 0).applyMatrix3(normalMatrix).transformDirection(inverseCamera);
  assert.ok(Math.abs(roof.y - 1) < 1e-12); assert.ok(Math.abs(wall.y) < 1e-12);
});
check('mapped bounds opt in without requiring attributes on generic boxes', () => {
  const material = new THREE.MeshLambertMaterial();
  material.defines = { FLIGHT_FACADE_BOUNDS: 1 }; attach(material, THREE);
  const output = shader(); material.onBeforeCompile(output, {});
  assert.equal(material.defines.FLIGHT_FACADE_BOUNDS, 1);
  assert.ok(output.vertexShader.includes('#ifdef FLIGHT_FACADE_BOUNDS\nattribute vec2 flightFacadeBounds;\n#endif'));
  assert.ok(output.fragmentShader.includes('flightFacadeUV.y = flightFacadeAboveBase / 12.0;'));
  assert.ok(output.fragmentShader.includes('totalEmissiveRadiance *= flightFacadeWindowZone;'));
  const withoutBounds = text => text.replace(/#ifdef FLIGHT_FACADE_BOUNDS\n[\s\S]*?#endif/g, '');
  assert.ok(!withoutBounds(output.vertexShader).includes('flightFacadeBounds'));
  assert.ok(!withoutBounds(output.fragmentShader).includes('vFlightFacadeBounds'));
});
check('mapped bounds and opaque reveal retain both shader hooks', () => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'skyschool-city-reveal.js'), 'utf8'), context);
  const material = new THREE.MeshLambertMaterial(); material.defines = { FLIGHT_FACADE_BOUNDS: 1 };
  attach(material, THREE); context.attachFlightCityReveal(material, THREE, { value: 0.5 });
  const output = shader(); material.onBeforeCompile(output, {});
  assert.equal(material.userData.flightCityFacade.patched, true);
  assert.equal(material.userData.flightCityReveal.patched, true);
  assert.ok(output.fragmentShader.includes('flightFacadeUV.y = flightFacadeAboveBase / 12.0;'));
  assert.ok(output.fragmentShader.includes('flightCityRevealThreshold(gl_FragCoord.xy)'));
  assert.ok(material.customProgramCacheKey().endsWith('|flight-city-facade:v3|flight-city-reveal:v1'));
});
check('base ambient shading leaves direct light and emission paths intact', () => {
  const material = new THREE.MeshLambertMaterial(); attach(material, THREE);
  const output = shader(); material.onBeforeCompile(output, {});
  assert.equal(material.userData.flightCityFacade.version, 3);
  assert.ok(output.fragmentShader.includes('float flightFacadeAboveBase = vFlightFacadePosition.y;'));
  assert.ok(output.fragmentShader.includes('flightFacadeAboveBase = vFlightFacadePosition.y - vFlightFacadeBounds.x;'));
  const factor = output.fragmentShader.indexOf('reflectedLight.indirectDiffuse *= flightFacadeBaseAmbient;');
  assert.ok(factor > output.fragmentShader.indexOf('#include <aomap_fragment>'));
  assert.ok(factor < output.fragmentShader.indexOf('vec3 outgoingLight ='));
  assert.ok(output.fragmentShader.includes('reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();'));
  assert.ok(output.fragmentShader.includes('totalEmissiveRadiance *= flightFacadeWindowZone;'));
});
check('missing ambient-light hook safely leaves both shader stages intact', () => {
  const material = new THREE.MeshLambertMaterial(); attach(material, THREE);
  const output = shader(); output.fragmentShader = output.fragmentShader.replace('#include <aomap_fragment>', '');
  const before = { ...output }; material.onBeforeCompile(output, {});
  assert.deepEqual(output, before);
  assert.equal(material.userData.flightCityFacade.patched, false);
  assert.equal(material.userData.flightCityFacade.reason, 'unsupported-shader-chunks');
});
process.stdout.write(JSON.stringify({ passed: results.length, checks: results, revision: THREE.REVISION, gpuCompilation: 'Must be verified in browser with renderer.debug.checkShaderErrors enabled.' }, null, 2) + '\n');
