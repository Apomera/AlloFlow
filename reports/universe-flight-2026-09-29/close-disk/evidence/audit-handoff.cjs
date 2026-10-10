'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const stage = __dirname, repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const baselineHash = '8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9';
const expectedCandidateHash = '6f1267255407b7de52bb685922281301fef58de9c91cc8a036577a7c317e56e8';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const binary = values => Buffer.from(values.buffer, values.byteOffset, values.byteLength);
const canonicalPath = path.join(repo, 'stem_lab/universe_flight_scene.js');
const paths = { baseline: path.join(stage, 'baseline-renderer.js'), candidate: path.join(stage, 'candidate-renderer.js') };
const driverHash = hash(fs.readFileSync(__filename));
const result = { completed: false, startedAtUtc: new Date().toISOString(), driverPath: __filename, driverHash, inputPaths: paths, regions: {}, limits: ['This host audit checks geometry, source data and analytical handoff invariants. Native WebGL images and UI workflows are separate checks.', 'The close observer handoff suppresses an invalid flat illustration; it does not conserve integrated light or simulate volumetric transfer.'] };
function near(actual, expected, tolerance, message) { assert.ok(Math.abs(actual - expected) <= tolerance, message + ': ' + actual + ' vs ' + expected); }
function load(source, candidate) {
  const marker = '  global.UniverseFlight =';
  assert.equal(source.split(marker).length, 2);
  const extra = candidate ? ',planeMarker:spiralPlaneMarker,writeMarker:writeSpiralPlane' : '';
  const injection = '  global.__handoffAudit={makeRegion:makeRegion,galaxyPixels:galaxyPixels,cloudPixels:cloudPixels,galaxyGeometry:galaxyGeometry,projectedGalaxyView:projectedGalaxyView,ellipticalView:ellipticalView,spiralBulgeView:spiralBulgeView,spiralDiskView:spiralDiskView,writeProjectedSurface:writeProjectedSurface,diskLightProfile:diskLightProfile,diskLight:function(){return Array.from(galaxyDiskLight);},diskAxisRatio:function(){return galaxyDiskAxisRatio;},routes:FLYBY_ROUTES,pointVertex:VERTEX,pointFragment:FRAGMENT,galaxyVertex:GALAXY_VERTEX,galaxyFragment:GALAXY_FRAGMENT' + extra + '};\n';
  // Separate exports retain the renderer's closed IIFE. Host intrinsics avoid
  // the slow per-sample global lookups of a VM context during atlas generation.
  const window = {}; new Function('window', source.replace(marker, injection + marker))(window); return window;
}
function toWorld(model, radial, height, angle) {
  const x = radial * Math.cos(angle), z = radial * Math.sin(angle), ct = Math.cos(model.tilt), st = Math.sin(model.tilt), cr = Math.cos(model.turn), sr = Math.sin(model.turn);
  const y1 = height * ct - z * st, z1 = height * st + z * ct;
  return model.center.map((value, i) => value + [x * cr - y1 * sr, x * sr + y1 * cr, z1][i] * model.radius);
}
function smooth01(value) { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); }
function expectedMarker(radial, height) {
  return Math.fround(0.5 * (1 - smooth01((radial - 1.12) / 0.10)) * (1 - smooth01((Math.abs(height) - 0.012) / 0.036)));
}
try {
  const baseline = fs.readFileSync(paths.baseline, 'utf8'), candidate = fs.readFileSync(paths.candidate, 'utf8');
  assert.equal(hash(baseline), baselineHash, 'Frozen 57 baseline');
  const candidateHash = hash(candidate); result.baselineHash = baselineHash; result.candidateHash = candidateHash;
  assert.equal(candidateHash, expectedCandidateHash, 'Frozen 58 candidate');
  const manifestBytes = fs.readFileSync(path.join(stage, 'patch-manifest.json')), manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.baseline, baselineHash); assert.equal(manifest.candidate, candidateHash); assert.equal(manifest.replacements.length, 6);
  let reconstructed = candidate;
  for (const replacement of manifest.replacements.slice().reverse()) {
    assert.equal(reconstructed.split(replacement.after).length, 2, 'Unique inverse patch');
    reconstructed = reconstructed.replace(replacement.after, replacement.before);
  }
  assert.equal(reconstructed, baseline, 'Six bounded replacements invert to exact baseline'); result.patchManifestHash = hash(manifestBytes);
  const canonicalBefore = hash(fs.readFileSync(canonicalPath)); assert.equal(canonicalBefore, baselineHash, 'Product source remains baseline during candidate audit');
  result.canonicalBefore = canonicalBefore;
  const b = load(baseline, false), a = load(candidate, true), bh = b.__handoffAudit, ah = a.__handoffAudit;
  for (const key of ['pointVertex', 'pointFragment']) assert.equal(ah[key], bh[key], key + ' exact shader');
  assert.equal(ah.galaxyVertex, bh.galaxyVertex, 'Entire galaxy vertex shader exact');
  const oldBranch = 'source=light*exp(-r*2.5)*edge*edge*(-v_bulge-1.0);}else{source=v_bulge>0.0?t.a*vec3(1.0,0.80,0.56)*(v_bulge-1.0):t.rgb;}', newBranch = 'source=light*exp(-r*2.5)*edge*edge*(-v_bulge-1.0);}else{source=v_bulge>=1.0?t.a*vec3(1.0,0.80,0.56)*(v_bulge-1.0):(v_bulge>0.0?t.rgb*(1.0-2.0*v_bulge):t.rgb);}';
  assert.equal(ah.galaxyFragment.split(newBranch).length, 2); assert.equal(ah.galaxyFragment.replace(newBranch, oldBranch), bh.galaxyFragment, 'Only flat source selection branch changes in galaxy fragment shader');
  for (const key of ['projectedGalaxyView', 'ellipticalView', 'spiralBulgeView', 'spiralDiskView', 'writeProjectedSurface', 'diskLightProfile']) assert.equal(ah[key].toString(), bh[key].toString(), key + ' exact helper');
  assert.ok(ah.galaxyVertex.includes('gl_Position=vec4(c.x*u_lens/u_aspect,c.y*u_lens,c.z*0.5,c.z)*dist;'), 'Existing homogeneous physical-distance projection preserved');
  assert.ok(ah.galaxyVertex.includes('float D=u_gamma*(1.0+u_beta*n.z);vec3 p=vec3(n.xy/D,(n.z+u_beta)/(1.0+u_beta*n.z));'), 'Existing optical vertex expression preserved');
  for (const key of Object.keys(b.UniverseFlight.math)) assert.equal(a.UniverseFlight.math[key].toString(), b.UniverseFlight.math[key].toString(), key + ' exact physics/navigation function');
  for (const id of Object.keys(bh.routes)) assert.equal(ah.routes[id].atTime.toString(), bh.routes[id].atTime.toString(), id + ' exact route function');
  result.preservedShaders = { pointVertexHash: hash(ah.pointVertex), pointFragmentHash: hash(ah.pointFragment), galaxyVertexHash: hash(ah.galaxyVertex), baselineGalaxyFragmentHash: hash(bh.galaxyFragment), candidateGalaxyFragmentHash: hash(ah.galaxyFragment) };
  result.preservedFunctions = { physicsAndNavigation: Object.keys(b.UniverseFlight.math), routeCount: Object.keys(bh.routes).length, projectedHelpers: ['projectedGalaxyView', 'ellipticalView', 'spiralBulgeView', 'spiralDiskView', 'writeProjectedSurface', 'diskLightProfile'] };
  console.log('Handoff audit: generating immutable 57 and 58 atlases.');
  const ba = bh.galaxyPixels(512), aa = ah.galaxyPixels(512), bc = bh.cloudPixels(), ac = ah.cloudPixels();
  assert.deepEqual(binary(aa), binary(ba), 'All galaxy RGBA bytes exact');
  assert.deepEqual(binary(ac), binary(bc), 'All cloud RGBA bytes exact');
  assert.deepEqual(ah.diskLight(), bh.diskLight(), 'Smooth disk channel normalization exact');
  assert.equal(ah.diskAxisRatio(), bh.diskAxisRatio(), 'Smooth disk axis ratio exact');
  result.atlases = { galaxyHash: hash(binary(aa)), cloudHash: hash(binary(ac)), galaxyBytes: aa.byteLength, cloudBytes: ac.byteLength, diskLight: ah.diskLight(), diskAxisRatio: ah.diskAxisRatio() };
  let gridCases = 0, maximumAnalyticalError = 0, maximumSymmetryError = 0, markerWriteCases = 0;
  for (const region of ['neighborhood', 'galaxy', 'cosmic']) {
    const ar = ah.makeRegion(region), br = bh.makeRegion(region);
    assert.deepEqual(binary(ar.points), binary(br.points), region + ' exact point records');
    assert.equal(JSON.stringify(ar.galaxies), JSON.stringify(br.galaxies), region + ' exact galaxy model data');
    assert.equal(JSON.stringify(a.UniverseFlight.landmarks(region)), JSON.stringify(b.UniverseFlight.landmarks(region)), region + ' exact landmarks');
    const ag = ah.galaxyGeometry(ar.galaxies), bg = bh.galaxyGeometry(br.galaxies);
    assert.deepEqual(binary(ag.points), binary(bg.points), region + ' exact full initial geometry (including proxies)');
    for (const key of ['ellipticals', 'bulges', 'disks']) assert.equal(JSON.stringify(ag[key]), JSON.stringify(bg[key]), region + ' exact ' + key + ' range metadata');
    const spirals = ar.galaxies.filter(model => !model.elliptical);
    assert.equal(ag.planes.length, spirals.length, region + ' one plane metadata range per spiral');
    for (let i = 0; i < ag.planes.length; i++) {
      const range = ag.planes[i], model = range.model, modelIndex = ar.galaxies.indexOf(model);
      assert.equal(model, spirals[i]); assert.equal(range.offset, modelIndex * 2304); assert.equal(range.count, 2304); assert.equal(range.marker, 0);
      for (const radial of [0, .08, .5, 1, 1.12, 1.13, 1.17, 1.219, 1.22, 1.4, 3]) for (const height of [0, .001, .011999, .012, .012001, .03, .047999, .048, .048001, .12]) for (const angle of [0, Math.PI / 7, Math.PI / 2, 3 * Math.PI / 4]) {
        const plus = ah.planeMarker(model, toWorld(model, radial, height, angle)), minus = ah.planeMarker(model, toWorld(model, radial, -height, angle));
        const expected = expectedMarker(radial, height);
        assert.ok(Number.isFinite(plus) && plus >= 0 && plus <= .5, 'Finite bounded marker');
        near(plus, expected, 6e-8, 'Source-frame analytic marker'); near(plus, minus, 6e-8, 'Above/below symmetry');
        maximumAnalyticalError = Math.max(maximumAnalyticalError, Math.abs(plus - expected)); maximumSymmetryError = Math.max(maximumSymmetryError, Math.abs(plus - minus)); gridCases++;
      }
      const original = new Float32Array(ag.points), localRange = { ...range }, inside = toWorld(model, .5, 0, Math.PI / 7), outside = toWorld(model, 3, 0, Math.PI / 7);
      assert.equal(ah.writeMarker(ag.points, localRange, inside), true, 'Entered disk changes marker'); assert.equal(localRange.marker, .5);
      for (let index = 0; index < ag.points.length; index++) {
        const modified = index >= range.offset && index < range.offset + range.count && (index - range.offset) % 6 === 5;
        assert.equal(ag.points[index], modified ? .5 : original[index], 'Only current plane marker slots changed');
      }
      assert.equal(ah.writeMarker(ag.points, localRange, inside), false, 'Unchanged pose avoids marker upload');
      assert.equal(ah.writeMarker(ag.points, localRange, toWorld(model, .08, .001, 0)), false, 'Different fully suppressed pose avoids redundant upload');
      assert.equal(ah.writeMarker(ag.points, localRange, outside), true, 'Exterior restores marker0');
      assert.deepEqual(binary(ag.points), binary(original), 'Exterior restores complete original geometry');
      assert.equal(ah.writeMarker(ag.points, localRange, toWorld(model, .5, .12, 0)), false, 'Above-disk nearby pose keeps exterior marker0'); markerWriteCases++;
    }
    result.regions[region] = { points: ar.points.length / 9, pointHash: hash(binary(ar.points)), models: ar.galaxies.length, geometryVertices: ag.points.length / 6, geometryHash: hash(binary(bg.points)), planeRanges: ag.planes.length, ellipticalRanges: ag.ellipticals.length, bulgeRanges: ag.bulges.length, diskRanges: ag.disks.length };
  }
  const testModel = { center: [91735132.25, -72393571.5, 38125932.75], radius: 12700, tilt: 1.137, turn: -.931, style: 'barred', elliptical: false };
  for (let ri = 0; ri <= 200; ri++) for (let hi = -80; hi <= 80; hi++) for (let ai = 0; ai < 8; ai++) {
    const radial = ri / 100, height = hi / 1000, actual = ah.planeMarker(testModel, toWorld(testModel, radial, height, ai * Math.PI / 4)), expected = expectedMarker(radial, height);
    assert.ok(Number.isFinite(actual) && actual >= 0 && actual <= .5); near(actual, expected, 6e-8, 'Dense analytical marker grid'); maximumAnalyticalError = Math.max(maximumAnalyticalError, Math.abs(actual - expected)); gridCases++;
  }
  result.gate = { sourceDiskSigma: .012, heightFullSuppression: .012, heightUnchanged: .048, radialFullSuppression: 1.12, radialUnchanged: 1.22, markerMinimum: 0, markerMaximum: .5, testedGridCases: gridCases, testedMarkerWriteRanges: markerWriteCases, maximumAnalyticalError, maximumSymmetryError };
  assert.equal(hash(fs.readFileSync(__filename)), driverHash, 'Executed audit driver frozen');
  assert.equal(hash(fs.readFileSync(paths.baseline)), baselineHash, 'Baseline input frozen'); assert.equal(hash(fs.readFileSync(paths.candidate)), candidateHash, 'Candidate input frozen');
  assert.equal(hash(fs.readFileSync(path.join(stage, 'patch-manifest.json'))), result.patchManifestHash, 'Patch manifest input frozen');
  assert.equal(hash(fs.readFileSync(canonicalPath)), canonicalBefore, 'Canonical source unchanged during audit'); result.canonicalAfter = canonicalBefore;
  result.completed = true; result.completedAtUtc = new Date().toISOString();
} catch (error) { result.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
fs.writeFileSync(path.join(stage, 'audit-handoff.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ completed: result.completed, driverHash, baselineHash: result.baselineHash, candidateHash: result.candidateHash, atlases: result.atlases, gate: result.gate, regions: result.regions, error: result.error }, null, 2));
