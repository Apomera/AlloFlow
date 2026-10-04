'use strict';
// Read-only audit of the generated scene and camera contracts. Private helpers
// are exposed in isolated VM copies; production source and mirrors stay intact.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const repo=process.env.UNIVERSE_REPO || path.resolve(__dirname,'..');
const reportDir=path.join(repo,'reports/universe-flight-2026-09-29/cloud-surfaces');
const outputDir=process.env.UNIVERSE_CLOUD_SURFACES_AUDIT_OUTPUT || reportDir;
const baselinePath=process.env.UNIVERSE_CLOUD_SURFACES_BASELINE || path.join(reportDir,'baseline-renderer.js');
const sourcePath=path.join(repo,'stem_lab/universe_flight_scene.js');
const mirrorPath=path.join(repo,'desktop/web-app/public/stem_lab/universe_flight_scene.js');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const normalize=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
const sourceBytes=fs.readFileSync(sourcePath),baselineBytes=fs.readFileSync(baselinePath),mirrorBytes=fs.readFileSync(mirrorPath);
assert.equal(sha(normalize(sourceBytes)),'c5d971c4becd5c265a4cc03be2792d8f3077d2ff8340ddb111ee85f227e37042','accepted final renderer, ignoring line endings');
assert.equal(sha(normalize(baselineBytes)),'4289f5586ca9083be97d42e1c0b273eb9d6f65703362c6cd05b9c89729ca0117','accepted baseline renderer, ignoring line endings');
assert.deepEqual(mirrorBytes,sourceBytes,'desktop renderer is an exact mirror');
assert.equal(sha(sourceBytes),'07b3e2c8020223f7c547215b97ef56ba8712224e7ca13319022b01b48d23e8f8','pinned renderer candidate');
assert.equal(sha(baselineBytes),'a178720362fe3772f2a6578657194f9414eec3e8e2369db381e6409893c1cf39','accepted baseline renderer');
const uiBytes=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_universe.js')),uiMirrorBytes=fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_universe.js'));
assert.equal(sha(uiBytes),'5cc081214178bbbbe2f57528a13047911d1a26615e7163630a0ca29e36c53458','accepted UI');assert.deepEqual(uiMirrorBytes,uiBytes,'exact UI mirror');
function load(bytes,filename) {
  const marker='  global.UniverseFlight =';
  let source=normalize(bytes).toString('utf8');
  assert.equal(source.split(marker).length,2,'unique private audit injection marker');
  source=source.replace(marker,'  global.__audit={makeRegion:makeRegion,routes:FLYBY_ROUTES,galaxyPixels:galaxyPixels,cloudPixels:cloudPixels,helpers:{galaxyGeometry:galaxyGeometry,ellipticalView:ellipticalView,writeEllipticalSurface:writeEllipticalSurface},shaders:{pointVertex:VERTEX,pointFragment:FRAGMENT,galaxyVertex:GALAXY_VERTEX,galaxyFragment:GALAXY_FRAGMENT}};\n'+marker);
  const window={};
  // Sharing the host's unchanged Math intrinsic avoids slow sandbox-global
  // lookups while generating millions of deterministic atlas samples.
  vm.runInNewContext(source,{window,Math},{filename,timeout:30000});
  return window;
}
const current=load(sourceBytes,'final-renderer-audit'),baseline=load(baselineBytes,'baseline-renderer-audit');
const binary=value=>Buffer.from(value.buffer,value.byteOffset,value.byteLength);
const jsonBytes=value=>Buffer.from(JSON.stringify(value));
const compareJson=(a,b,message)=>assert.deepEqual(jsonBytes(a),jsonBytes(b),message);
const result={completed:false,sourceHash:sha(sourceBytes),sourceNormalizedHash:sha(normalize(sourceBytes)),baselineHash:sha(baselineBytes),baselineNormalizedHash:sha(normalize(baselineBytes)),mirrorsMatch:true,uiHash:sha(uiBytes),uiMirrorsMatch:true,regions:{},helpers:{},atlases:{},shaders:{},publicMath:{},landmarks:{},flybyCatalogs:{},routes:{},checks:[],limits:['Star surface sizes, colors and brightness remain illustrative teaching visuals.','Only the bounded authored-cloud draw path and point shader pair change; all world data and both atlases remain fixed.','Scene data, atlas, helper, catalog and camera samples are compared with the preserved renderer; this audit does not measure browser rasterization.']};
for(const name of ['neighborhood','galaxy','cosmic']) {
  const a=current.__audit.makeRegion(name),b=baseline.__audit.makeRegion(name);
  assert.deepEqual(binary(a.points),binary(b.points),name+' exact generated point bytes');
  compareJson(a.galaxies,b.galaxies,name+' exact generated model bytes');
  const landmarks=current.UniverseFlight.landmarks(name);
  compareJson(landmarks,baseline.UniverseFlight.landmarks(name),name+' landmark catalog');
  const catalog=current.UniverseFlight.flybys(name);
  compareJson(catalog,baseline.UniverseFlight.flybys(name),name+' public flyby catalog');
  const aGeometry=current.__audit.helpers.galaxyGeometry(a.galaxies),bGeometry=baseline.__audit.helpers.galaxyGeometry(b.galaxies);
  assert.deepEqual(binary(aGeometry.points),binary(bGeometry.points),name+' galaxy helper geometry bytes');
  compareJson(aGeometry.ellipticals,bGeometry.ellipticals,name+' elliptical range metadata');
  result.regions[name]={pointCount:a.points.length/9,pointBytes:a.points.byteLength,pointBytesHash:sha(binary(a.points)),galaxyModelCount:a.galaxies.length,galaxyModelsHash:sha(jsonBytes(a.galaxies)),galaxyGeometryFloats:aGeometry.points.length,galaxyGeometryHash:sha(binary(aGeometry.points)),matchesBaseline:true,nonPositionAttributesMatchBaseline:true};
  result.landmarks[name]={count:landmarks.length,catalogHash:sha(jsonBytes(landmarks)),matchesBaseline:true};
  result.flybyCatalogs[name]={count:catalog.length,catalogHash:sha(jsonBytes(catalog)),matchesBaseline:true};
}
console.log('Audit: all world data, geometry and catalogs match.');
for(const name of Object.keys(current.__audit.helpers)) {
  const a=current.__audit.helpers[name].toString(),b=baseline.__audit.helpers[name].toString();
  assert.equal(a,b,name+' helper source');
  result.helpers[name]={sourceHash:sha(Buffer.from(a)),matchesBaseline:true};
}
for(const[name,argument]of[['galaxyPixels',512],['cloudPixels',undefined]]) {
 const a=current.__audit[name](argument),b=baseline.__audit[name](argument);
 assert.deepEqual(binary(a),binary(b),name+' exact atlas bytes');assert.equal(current.__audit[name](argument),a,name+' keeps its CPU cache identity');
 result.atlases[name]={bytes:a.byteLength,hash:sha(binary(a)),baselineHash:sha(binary(b)),matchesBaseline:true,cached:true};
}
for(const name of Object.keys(current.__audit.shaders)) {
  const a=current.__audit.shaders[name],b=baseline.__audit.shaders[name];
  const unchanged=name.startsWith('galaxy');
  if(unchanged)assert.equal(a,b,name+' shader source');else assert.notEqual(a,b,name+' intended cloud surface shader changes');

  result.shaders[name]={hash:sha(Buffer.from(a)),baselineHash:sha(Buffer.from(b)),matchesBaseline:unchanged,intentionallyChanged:!unchanged};
}
assert.deepEqual(Object.keys(current.UniverseFlight.math),Object.keys(baseline.UniverseFlight.math),'public math API names');
for(const name of Object.keys(current.UniverseFlight.math)) {
  const a=current.UniverseFlight.math[name].toString(),b=baseline.UniverseFlight.math[name].toString();
  assert.equal(a,b,name+' public math source');
  result.publicMath[name]={sourceHash:sha(Buffer.from(a)),matchesBaseline:true};
}
compareJson(current.UniverseFlight.flybys(),baseline.UniverseFlight.flybys(),'complete public flyby catalog');
assert.deepEqual(Object.keys(current.__audit.routes),['halo','nebula','group','stellar'],'all four authored routes');
assert.deepEqual(Object.keys(current.__audit.routes),Object.keys(baseline.__audit.routes),'private route catalog names');
for(const id of Object.keys(current.__audit.routes)) {
  const a=current.__audit.routes[id],b=baseline.__audit.routes[id];
  compareJson(a,b,id+' route metadata');
  assert.equal(a.atTime.toString(),b.atTime.toString(),id+' atTime function source');
  const samples=[];
  for(let index=0;index<=a.durationSeconds*10;index++) {
    const seconds=index/10,sample=a.atTime(seconds);
    compareJson(sample,b.atTime(seconds),id+' exact camera sample at '+seconds+' seconds');
    samples.push(sample);
  }
  result.routes[id]={durationSeconds:a.durationSeconds,sampleIntervalSeconds:0.1,sampleCount:samples.length,metadataHash:sha(jsonBytes(a)),atTimeSourceHash:sha(Buffer.from(a.atTime.toString())),sampleHash:sha(jsonBytes(samples)),matchesBaseline:true};
}
result.totalRouteSamples=Object.values(result.routes).reduce((sum,value)=>sum+value.sampleCount,0);
assert.equal(result.totalRouteSamples,1704,'all four route poses at 100 ms intervals');
// Evaluate the exact static append block in isolation. This checks the
// production construction rather than a duplicated geometry algorithm.
const normalizedSource=normalize(sourceBytes).toString('utf8'),appendStart='      var cloudOffsets = [];',appendEnd='      galaxySurfaces.points = surfaces;';
assert.equal(normalizedSource.split(appendStart).length,2);const start=normalizedSource.indexOf(appendStart),end=normalizedSource.indexOf(appendEnd,start);assert.ok(end>start);
const appendBlock=normalizedSource.slice(start,end+appendEnd.length);
const append=vm.runInNewContext('(function(points,geometry,region){var data={points:points},settings={region:region},galaxySurfaces={points:geometry},cloudQuadByteOffset=0,cloudQuadCount=0;'+appendBlock+';return {points:galaxySurfaces.points,indices:cloudOffsets.map(function(offset){return offset/9;}),byteOffset:cloudQuadByteOffset,count:cloudQuadCount};})',{Math},{timeout:30000});
const stellarCorners=new Float32Array([0,0,0,-1,-1,0,0,0,1,-1,0,0,0,1,1,0,0,0,-1,-1,0,0,0,1,1,0,0,0,-1,1]),corners=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];
result.cloudSurfaces={regions:{},authoredRecords:1000,blueRecords:570,violetRecords:430,sourceIndexRange:[8500,9499],vertexCount:6000,vertexStrideBytes:44,canonicalFields:9,cloudCssCap:384,pointCssCap:60};
for(const name of ['neighborhood','galaxy','cosmic']){
 const data=current.__audit.makeRegion(name),geometry=current.__audit.helpers.galaxyGeometry(data.galaxies),canonical=Buffer.from(binary(data.points)),expanded=append(data.points,geometry.points,name);
 const prefix=geometry.points.length;assert.deepEqual(binary(expanded.points.subarray(0,prefix)),binary(geometry.points));assert.deepEqual(binary(expanded.points.subarray(prefix,prefix+30)),binary(stellarCorners));
 assert.equal(expanded.byteOffset,(prefix+30)*4);assert.equal(expanded.count,expanded.indices.length*6);assert.equal(expanded.points.length,prefix+30+expanded.count*11);assert.deepEqual(binary(data.points),canonical,'static append leaves canonical points intact');
 if(name==='neighborhood'){
  assert.equal(expanded.indices.length,1000);assert.deepEqual(Array.from(expanded.indices),Array.from({length:1000},(_,index)=>8500+index));assert.equal(expanded.count,6000);assert.equal(expanded.byteOffset,120);
  for(let source=0;source<1000;source++)for(let corner=0;corner<6;corner++){const offset=(prefix+30)+(source*6+corner)*11;assert.deepEqual(binary(expanded.points.subarray(offset,offset+9)),binary(data.points.subarray((8500+source)*9,(8501+source)*9)),'exact canonical cloud vertex');assert.deepEqual(Array.from(expanded.points.subarray(offset+9,offset+11)),corners[corner]);}
 }else{assert.equal(expanded.indices.length,0);assert.equal(expanded.count,0);}
 result.cloudSurfaces.regions[name]={records:expanded.indices.length,vertices:expanded.count,byteOffset:expanded.byteOffset,bufferFloats:expanded.points.length,bufferHash:sha(binary(expanded.points)),galaxyPrefixMatchesBaseline:true,stellarCornersMatchBaseline:true,canonicalSourceFieldsMatch:true};
}
const intendedEdits=[{"before":"    'uniform vec3 u_stellarCenters[3]; uniform float u_stellarCount,u_quadMax; uniform mediump float u_stellarQuad;',","after":"    'uniform vec3 u_stellarCenters[3]; uniform float u_stellarCount,u_quadMax; uniform mediump float u_stellarQuad;',\n    'uniform mediump float u_cloudQuad; uniform float u_cloudQuadMax;',"},{"before":"    // Only the three authored nearby stars can cross into the projected-quad\n    // path. Exact Float32 source centers keep other stars and clouds unchanged.","after":"    // Only the three authored nearby stars enter the stellar quad path.\n    // Exact Float32 centers keep all other stellar sprites unchanged."},{"before":"    // A point whose center leaves the clip volume vanishes as a whole. Its","after":"    // The existing 1,000 nearby emission records gain projected surfaces only\n    // when their point sprites approach the hardware/display cap. Distant\n    // clouds and the unresolved point path keep their existing output.\n    '  if (isCloud > 0.5 && a_cloud >= 5.0 && distance > 0.00001 && projectedSize > maximumSize * 0.8) {',\n    '    quadBlend = smoothstep(maximumSize * 0.8, maximumSize, projectedSize);',\n    '  }',\n    // A point whose center leaves the clip volume vanishes as a whole. Its"},{"before":"    // gl_PointCoord runs top to bottom in GLES; match that orientation exactly","after":"    '  if (u_cloudQuad > 0.5) {',\n    '    spriteSize = clamp(projectedSize, min(minimumSize, maximumSize), max(maximumSize, u_cloudQuadMax));',\n    '    gl_Position.xy += a_corner * spriteSize / vec2(u_height * u_aspect, u_height) * gl_Position.w;',\n    '  }',\n    // gl_PointCoord runs top to bottom in GLES; match that orientation exactly"},{"before":"    '  if (camera.z <= 0.001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; quadBlend = 0.0; }',","after":"    '  if (camera.z <= 0.001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; quadBlend = 0.0; }',\n    // Zero-weight cloud quads collapse outside the clip volume, so a distant\n    // batch adds vertex work without rasterizing transparent cloud surfaces.\n    '  if (u_cloudQuad > 0.5 && quadBlend <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }',"},{"before":"    '  float cloudDetail = step(5.0, a_cloud) * smoothstep(12.0, 30.0, gl_PointSize / u_dpr);',","after":"    '  float cloudDetail = step(5.0, a_cloud) * smoothstep(12.0, 30.0, (u_cloudQuad > 0.5 ? spriteSize : gl_PointSize) / u_dpr);',"},{"before":"    '  v_light = a_light * bandGain * u_exposure * exposure * mix(1.0, coverage, isCloud) * mix(1.0 - quadBlend, quadBlend, u_stellarQuad);',","after":"    '  v_light = a_light * bandGain * u_exposure * exposure * mix(1.0, coverage, isCloud) * mix(1.0 - quadBlend, quadBlend, max(u_stellarQuad, u_cloudQuad));',"},{"before":"    'uniform sampler2D u_cloudTexture; uniform mediump float u_stellarQuad;',","after":"    'uniform sampler2D u_cloudTexture; uniform mediump float u_stellarQuad,u_cloudQuad;',"},{"before":"    '  vec2 p = u_stellarQuad > 0.5 ? v_quadCoord : gl_PointCoord * 2.0 - 1.0;',","after":"    '  vec2 p = max(u_stellarQuad, u_cloudQuad) > 0.5 ? v_quadCoord : gl_PointCoord * 2.0 - 1.0;',"},{"before":"    var stellarRecords = [], stellarCenters = new Float32Array(9), cornerAttribute, stellarQuadFirst = 0;","after":"    var stellarRecords = [], stellarCenters = new Float32Array(9), cornerAttribute, stellarQuadFirst = 0;\n    var cloudQuadByteOffset = 0, cloudQuadCount = 0;"},{"before":"      // Reuse this buffer's five-float layout for one static corner quad. Its\n      // tail stays outside every galaxy draw and elliptical update range.\n      var surfaces = new Float32Array(galaxySurfaces.points.length + 30);\n      surfaces.set(galaxySurfaces.points);\n      surfaces.set([0,0,0,-1,-1, 0,0,0,1,-1, 0,0,0,1,1, 0,0,0,-1,-1, 0,0,0,1,1, 0,0,0,-1,1], galaxySurfaces.points.length);\n      galaxySurfaces.points = surfaces;","after":"      // Keep the galaxy prefix and the stellar corner quad exact. Append one\n      // static six-vertex surface for each authored nearby emission source;\n      // its nine source fields stay identical to the canonical point buffer.\n      var cloudOffsets = [];\n      if (settings.region === 'neighborhood') {\n        for (var cloudOffset = 0; cloudOffset < data.points.length; cloudOffset += 9) {\n          if (data.points[cloudOffset + 8] >= 5) cloudOffsets.push(cloudOffset);\n        }\n      }\n      cloudQuadCount = cloudOffsets.length * 6;\n      cloudQuadByteOffset = (galaxySurfaces.points.length + 30) * 4;\n      var surfaces = new Float32Array(galaxySurfaces.points.length + 30 + cloudQuadCount * 11);\n      surfaces.set(galaxySurfaces.points);\n      surfaces.set([0,0,0,-1,-1, 0,0,0,1,-1, 0,0,0,1,1, 0,0,0,-1,-1, 0,0,0,1,1, 0,0,0,-1,1], galaxySurfaces.points.length);\n      var cloudWrite = cloudQuadByteOffset / 4;\n      var cloudCorners = [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];\n      cloudOffsets.forEach(function(offset) {\n        cloudCorners.forEach(function(corner) {\n          surfaces.set(data.points.subarray(offset, offset + 9), cloudWrite);\n          surfaces[cloudWrite + 9] = corner[0]; surfaces[cloudWrite + 10] = corner[1];\n          cloudWrite += 11;\n        });\n      });\n      galaxySurfaces.points = surfaces;"},{"before":"      gl.uniform1f(uniforms.stellarQuad, 0);","after":"      gl.uniform1f(uniforms.stellarQuad, 0);\n      gl.uniform1f(uniforms.cloudQuad, 0);\n      var cloudMaximum = Math.min(60 * pixelRatio(), pointMax);\n      var cloudQuadMaximum = Math.max(cloudMaximum, Math.min(384 * pixelRatio(), 2 * Math.max(canvas.width, canvas.height)));\n      gl.uniform1f(uniforms.cloudQuadMax, cloudQuadMaximum);"},{"before":"      gl.drawArrays(gl.POINTS, 0, pointCount);\n      if (stellarRecords.length) {","after":"      gl.drawArrays(gl.POINTS, 0, pointCount);\n      if (cloudQuadCount) {\n        // One additive batch reuses the existing program, atlas and buffer.\n        // The shader clips unresolved and behind-camera surfaces; there are\n        // no per-source draw calls or camera-time vertex/texture uploads.\n        gl.blendFunc(gl.ONE, gl.ONE);\n        gl.bindBuffer(gl.ARRAY_BUFFER, galaxyBuffer);\n        pointAttributes.forEach(function(a) {\n          gl.enableVertexAttribArray(a[0]);\n          gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, 44, cloudQuadByteOffset + a[2]);\n        });\n        gl.enableVertexAttribArray(cornerAttribute);\n        gl.vertexAttribPointer(cornerAttribute, 2, gl.FLOAT, false, 44, cloudQuadByteOffset + 36);\n        gl.uniform1f(uniforms.cloudQuad, 1);\n        gl.drawArrays(gl.TRIANGLES, 0, cloudQuadCount);\n        gl.uniform1f(uniforms.cloudQuad, 0);\n        gl.disableVertexAttribArray(cornerAttribute);\n        attributes(pointAttributes, buffer, 36);\n      }\n      if (stellarRecords.length) {"},{"before":"      stellarRecords = []; stellarCenters = null; stellarQuadFirst = 0;","after":"      stellarRecords = []; stellarCenters = null; stellarQuadFirst = 0;\n      cloudQuadCount = 0; cloudQuadByteOffset = 0;"},{"before":"'stellarStructure', 'stellarLoops', 'galacticBand'].forEach","after":"'stellarStructure', 'stellarLoops', 'galacticBand', 'cloudQuad', 'cloudQuadMax'].forEach"}];let restored=normalizedSource;
for(const edit of intendedEdits.slice().reverse()){assert.equal(restored.split(edit.after).length,2,'single reviewed source edit');restored=restored.replace(edit.after,edit.before);}
assert.deepEqual(Buffer.from(restored),normalize(baselineBytes),'reversing only the fifteen reviewed cloud edits restores the exact renderer baseline');
result.sourceChanges={reviewedEditCount:intendedEdits.length,reviewedEditsHash:sha(Buffer.from(JSON.stringify(intendedEdits))),reverseRestoresBaseline:true};
result.checks.push('All source point populations, galaxy geometry, models and catalogs retain exact bytes.','Existing geometry helpers and all public math functions preserve their source.','Both cached atlases and both galaxy shaders retain exact accepted bytes.','All four authored routes preserve all 1704 camera samples at 100 ms intervals.','The static cloud batch preserves all nine fields of 570 blue and 430 violet sources in 6000 vertices.','Only the fifteen reviewed cloud-path edits and point shader pair change; reversing them restores the exact baseline.');
assert.equal(result.checks.length,6);
assert.deepEqual(fs.readFileSync(sourcePath),sourceBytes,'renderer remained stable during audit');
assert.deepEqual(fs.readFileSync(mirrorPath),mirrorBytes,'mirror remained stable during audit');
assert.deepEqual(fs.readFileSync(baselinePath),baselineBytes,'baseline remained stable during audit');
assert.deepEqual(fs.readFileSync(path.join(repo,'stem_lab/stem_tool_universe.js')),uiBytes,'UI stayed stable during audit');assert.deepEqual(fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_universe.js')),uiMirrorBytes,'UI mirror stayed stable during audit');
result.completed=true;
fs.mkdirSync(outputDir,{recursive:true});
const output=path.join(outputDir,'renderer-audit.json');
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({completed:true,sourceHash:result.sourceHash,sourceNormalizedHash:result.sourceNormalizedHash,pointCounts:Object.values(result.regions).map(value=>value.pointCount),routes:Object.fromEntries(Object.entries(result.routes).map(([id,value])=>[id,value.sampleCount])),checks:result.checks.length,output},null,2));
