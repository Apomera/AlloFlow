'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const stage = __dirname;
const sourcePath = path.join(repo, 'stem_lab/universe_flight_scene.js');
const baselineHash = 'c0cc2486b3d5edd620e5975daec3d23b8f2e995a24db151be27ac30820d058c7';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const baseline = fs.readFileSync(sourcePath);
assert.equal(hash(baseline), baselineHash, 'Canonical renderer is the frozen c0 baseline');
fs.writeFileSync(path.join(stage, 'baseline-renderer.js'), baseline);
let candidate = baseline.toString('utf8');
const changes = [];
function replaceOnce(before, after, purpose) {
  const escaped = before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\n/g, '\\r?\\n');
  const pattern = new RegExp(escaped, 'g');
  assert.equal([...candidate.matchAll(pattern)].length, 1, purpose + ' has one exact source anchor');
  candidate = candidate.replace(pattern, () => after);
  changes.push({purpose, before, after});
}
replaceOnce('  var galaxyAtlasBytes = null, cloudAtlasBytes = null;',
`  var galaxyAtlasBytes = null, cloudAtlasBytes = null;
  var galaxyDiskLight = new Float32Array(9), galaxyDiskAxisRatio = 0.05;`, 'Cache the extracted disk presentation data beside the existing atlases');
replaceOnce('  function galaxyPixels(size) {',
`  // A decreasing radial profile has a nonnegative Abel deprojection. Its
  // oblate projection provides smooth collective light with finite thickness;
  // the authored arm map stays on its existing world-space plane.
  function diskLightProfile(radius) {
    var edge = Math.max(0, 1 - Math.pow(radius / 1.12, 4));
    return Math.exp(-radius * 2.5) * edge * edge;
  }
  function extractDiskLight(data, size, gutter, span) {
    var profiles = new Float64Array(size * size), total = 0, moment = 0;
    for (var y = gutter; y < size - gutter; y++) for (var x = gutter; x < size - gutter; x++) {
      var px = ((x - gutter) / (span - 1) * 2 - 1) * 1.22;
      var pz = ((y - gutter) / (span - 1) * 2 - 1) * 1.22;
      var radius = Math.hypot(px, pz), light = diskLightProfile(radius);
      profiles[y * size + x] = light; total += light; moment += light * radius * radius;
    }
    // The existing non-bulge points have vertical sigma 0.012 R. Match that
    // second moment in this rounded source instead of choosing a display width.
    galaxyDiskAxisRatio = 0.012 / Math.sqrt(moment / (2 * total));
    var tint = [0.53, 0.74, 1];
    for (var tile = 0; tile < 3; tile++) {
      var safe = Infinity, removed = [0, 0, 0];
      for (var row = gutter; row < size - gutter; row++) for (var col = gutter; col < size - gutter; col++) {
        var profile = profiles[row * size + col];
        if (!(profile > 0)) continue;
        var offset = (row * size * 4 + tile * size + col) * 4;
        // The extra byte allows floor quantization while guaranteeing that
        // every actual subtraction remains within the existing RGB byte.
        for (var channel = 0; channel < 3; channel++) safe = Math.min(safe, (data[offset + channel] + 1) / (255 * profile * tint[channel]));
      }
      var amplitude = Math.min(0.012, safe * 0.72);
      for (var r = gutter; r < size - gutter; r++) for (var c = gutter; c < size - gutter; c++) {
        var p = profiles[r * size + c], at = (r * size * 4 + tile * size + c) * 4;
        for (var ch = 0; ch < 3; ch++) {
          var moved = Math.min(data[at + ch], Math.floor(255 * amplitude * p * tint[ch]));
          data[at + ch] -= moved; removed[ch] += moved;
        }
      }
      // Normalize each channel to the light actually removed after byte
      // quantization. This conserves face-on integrated display light.
      for (var component = 0; component < 3; component++) galaxyDiskLight[tile * 3 + component] = removed[component] / (255 * total);
    }
  }
  function galaxyPixels(size) {`, 'Extract a conservative smooth disk component after tone mapping and quantify its thickness');
replaceOnce('    if (size === GALAXY_TILE_SIZE) galaxyAtlasBytes = data;',
`    extractDiskLight(data, size, gutter, span);
    if (size === GALAXY_TILE_SIZE) galaxyAtlasBytes = data;`, 'Move disk light from the planar atlas into the rounded component');
replaceOnce('  function writeProjectedSurface(values, range, observer) {',
`  function spiralDiskView(model, observer) {
    var q = galaxyDiskAxisRatio;
    var shape = projectedGalaxyView(model, observer, [1, q * q, 1], 1);
    // Area compensation is bounded by the source's finite axial ratio.
    shape.gain = clamp(shape.gain, 0, 1 / q);
    // This is an exterior orthographic emission proxy. Fade before entering
    // the disk; the existing points retain their actual depth and perspective.
    var range = Math.hypot.apply(Math, model.center.map(function(value, i) { return value - observer[i]; })) / model.radius;
    var fade = clamp((range - 0.6) / 1.4, 0, 1);
    shape.gain *= fade * fade * (3 - 2 * fade);
    return shape;
  }
  function writeProjectedSurface(values, range, observer) {`, 'Project an oblate smooth disk source with bounded area compensation and a close-view fade');
replaceOnce('    var shape=range.bulge?spiralBulgeView(range.model,observer):ellipticalView(range.model,observer);',
'    var shape=range.disk?spiralDiskView(range.model,observer):range.bulge?spiralBulgeView(range.model,observer):ellipticalView(range.model,observer);', 'Dispatch the shared projected surface writer to the disk proxy');
replaceOnce('      values[offset+5]=range.bulge?1+shape.gain:0;',
'      values[offset+5]=range.disk?-1-shape.gain:range.bulge?1+shape.gain:0;', 'Pack smooth disk emission into the existing presentation attribute');
replaceOnce('    var values=[],segments=8,ellipticals=[],bulges=[];',
`    if (!galaxyAtlasBytes) galaxyPixels(GALAXY_TILE_SIZE);
    var values=[],segments=8,ellipticals=[],bulges=[],disks=[];`, 'Prepare the shared disk data and retain the existing geometry prefix');
replaceOnce('    return {points:new Float32Array(values),ellipticals:ellipticals,bulges:bulges};',
`    models.forEach(function(model) {
      if (model.elliptical) return;
      var tile=Math.max(0,GALAXY_STYLES.indexOf(model.style||'spiral'));
      var first=GALAXY_GUTTER+0.5,span=GALAXY_TILE_SIZE-GALAXY_GUTTER*2-1;
      disks.push({model:model,offset:values.length,count:segments*segments*6*6,disk:true});
      function diskVertex(u,v) {
        values.push(model.center[0],model.center[1],model.center[2],
          (tile*GALAXY_TILE_SIZE+first+u*span)/(GALAXY_TILE_SIZE*4),(first+v*span)/GALAXY_TILE_SIZE,-1);
      }
      for(var j=0;j<segments;j++)for(var k=0;k<segments;k++) {
        var u=k/segments,v=j/segments,u1=(k+1)/segments,v1=(j+1)/segments;
        diskVertex(u,v);diskVertex(u1,v);diskVertex(u1,v1);diskVertex(u,v);diskVertex(u1,v1);diskVertex(u,v1);
      }
    });
    return {points:new Float32Array(values),ellipticals:ellipticals,bulges:bulges,disks:disks};`, 'Append one rounded disk range per spiral to the existing galaxy buffer');
replaceOnce("    'precision mediump float;uniform sampler2D u_texture;uniform float u_exposure;varying vec2 v_uv;varying float v_shift,v_bulge;',",
"    'precision mediump float;uniform sampler2D u_texture;uniform float u_exposure;uniform vec3 u_diskLight[3];varying vec2 v_uv;varying float v_shift,v_bulge;',", 'Share extracted RGB normalization through three small uniforms');
replaceOnce("    'void main(){vec4 t=texture2D(u_texture,v_uv);vec3 source=v_bulge>0.0?t.a*vec3(1.0,0.80,0.56)*(v_bulge-1.0):t.rgb;float s=clamp(log(max(v_shift,0.0001))*0.42,-0.85,0.85);',",
`    'void main(){vec4 t=texture2D(u_texture,v_uv);vec3 source;',
    'if(v_bulge<0.0){float tile=floor(v_uv.x*4.0);vec3 light=tile<0.5?u_diskLight[0]:(tile<1.5?u_diskLight[1]:u_diskLight[2]);',
    'vec2 local=(vec2(fract(v_uv.x*4.0),v_uv.y)*512.0-vec2(8.5))/495.0*2.0-1.0;float r=length(local*1.22);float edge=max(0.0,1.0-pow(r/1.12,4.0));',
    'source=light*exp(-r*2.5)*edge*edge*(-v_bulge-1.0);}else{source=v_bulge>0.0?t.a*vec3(1.0,0.80,0.56)*(v_bulge-1.0):t.rgb;}',
    'float s=clamp(log(max(v_shift,0.0001))*0.42,-0.85,0.85);',`, 'Render only the smooth radial component on the projected oblate surface');
replaceOnce("    'float gain=u_exposure*clamp(pow(v_shift,1.5),0.012,4.0);gl_FragColor=vec4(color*gain,t.a);}'",
"    'float gain=u_exposure*clamp(pow(v_shift,1.5),0.012,4.0);gl_FragColor=vec4(color*gain,v_bulge<0.0?0.0:t.a);}'", 'Keep the new disk emission additive without an opacity claim');
replaceOnce('      if (!galaxySurfaces || !galaxySurfaces.ellipticals.length&&!galaxySurfaces.bulges.length) return;',
'      if (!galaxySurfaces || !galaxySurfaces.ellipticals.length&&!galaxySurfaces.bulges.length&&!galaxySurfaces.disks.length) return;', 'Include the disk ranges in the existing camera-position update guard');
replaceOnce('      galaxySurfaces.ellipticals.concat(galaxySurfaces.bulges).forEach(function(range){',
'      galaxySurfaces.ellipticals.concat(galaxySurfaces.bulges,galaxySurfaces.disks).forEach(function(range){', 'Update only presentation ranges when the observer position changes');
replaceOnce('        gl.uniform1i(galaxyUniforms.texture, 0);',
`        gl.uniform1i(galaxyUniforms.texture, 0);
        gl.uniform3fv(galaxyUniforms.diskLight, galaxyDiskLight);`, 'Upload the cached channel normalization during the existing diffuse draw');
replaceOnce("      ['position', 'right', 'up', 'forward', 'aspect', 'beta', 'gamma', 'exposure', 'lens', 'texture'].forEach(function(name) { galaxyUniforms[name] = gl.getUniformLocation(galaxyProgram, 'u_' + name); });",
`      ['position', 'right', 'up', 'forward', 'aspect', 'beta', 'gamma', 'exposure', 'lens', 'texture'].forEach(function(name) { galaxyUniforms[name] = gl.getUniformLocation(galaxyProgram, 'u_' + name); });
      galaxyUniforms.diskLight = gl.getUniformLocation(galaxyProgram, 'u_diskLight[0]');`, 'Locate the one added uniform without allocating another resource');

assert.equal(hash(fs.readFileSync(sourcePath)), baselineHash, 'Canonical renderer remains frozen before writing candidate');
fs.writeFileSync(path.join(stage, 'candidate-renderer.js'), candidate);
fs.writeFileSync(path.join(stage, 'candidate-patch-manifest.json'), JSON.stringify({baselineHash, candidateHash: hash(candidate), sourcePath, targetPath:path.join(stage,'candidate-renderer.js'), changes}, null, 2));
console.log(JSON.stringify({candidateReady:true, baselineHash, candidateHash:hash(candidate), changes:changes.length}));

function load(source, label) {
  const marker = '  global.UniverseFlight =';
  assert.equal(source.split(marker).length, 2);
  const extra = label === 'candidate' ? ',diskLightProfile:diskLightProfile,spiralDiskView:spiralDiskView,diskLight:function(){return Array.from(galaxyDiskLight);},diskAxisRatio:function(){return galaxyDiskAxisRatio;}' : '';
  const injected=source.replace(marker,'  global.__diskAudit={makeRegion:makeRegion,galaxyPixels:galaxyPixels,galaxyGeometry:galaxyGeometry,projectedGalaxyView:projectedGalaxyView,ellipticalView:ellipticalView,writeProjectedSurface:writeProjectedSurface,routes:FLYBY_ROUTES,pointVertex:VERTEX,pointFragment:FRAGMENT'+extra+'};\n'+marker);
  // The guarded renderer is already a closed IIFE. A separate window object
  // isolates its exports while host intrinsics avoid slow VM-global lookups
  // in the millions of procedural atlas samples.
  const window={}; new Function('window',injected)(window); return window;
}
const b = load(baseline.toString('utf8'),'baseline'), a = load(candidate,'candidate');
assert.equal(a.__diskAudit.pointVertex,b.__diskAudit.pointVertex,'Point vertex shader preserved');
assert.equal(a.__diskAudit.pointFragment,b.__diskAudit.pointFragment,'Point fragment shader preserved');
assert.equal(a.__diskAudit.ellipticalView.toString(),b.__diskAudit.ellipticalView.toString(),'Elliptical projection helper preserved');
const binary=value=>Buffer.from(value.buffer,value.byteOffset,value.byteLength);
console.log('Math audit: generating c0 atlas.');
const bb=b.__diskAudit.galaxyPixels(512);
console.log('Math audit: generating candidate atlas.');
const aa=a.__diskAudit.galaxyPixels(512), colors=a.__diskAudit.diskLight();
console.log('Math audit: checking channel conservation and all byte bounds.');
const gutter=8,span=496,removedTotals=[0,0,0,0,0,0,0,0,0],preTotals=Array(12).fill(0),postTotals=Array(12).fill(0),errorSums=Array(9).fill(0),errorMaxima=Array(9).fill(0); let totalProfile=0,momentProfile=0,maxFaceOnError=0;
for(let y=0;y<512;y++)for(let x=0;x<512;x++) {
  const inner=x>=gutter&&x<512-gutter&&y>=gutter&&y<512-gutter;
  const px=((x-gutter)/(span-1)*2-1)*1.22,pz=((y-gutter)/(span-1)*2-1)*1.22;
  const r=Math.hypot(px,pz),p=inner?a.__diskAudit.diskLightProfile(r):0;
  totalProfile+=p;momentProfile+=p*r*r;
  for(let tile=0;tile<4;tile++)for(let ch=0;ch<4;ch++){
    const i=(y*512*4+tile*512+x)*4+ch;
    if(ch<3){preTotals[tile*3+ch]+=bb[i];postTotals[tile*3+ch]+=aa[i];}
    if(tile===3||ch===3)assert.equal(aa[i],bb[i],'Elliptical tile and all alpha bytes preserved');
    else {assert.ok(aa[i]<=bb[i],'Disk extraction is nonnegative'); removedTotals[tile*3+ch]+=bb[i]-aa[i]; const error=Math.abs(bb[i]-aa[i]-255*p*colors[tile*3+ch]); errorSums[tile*3+ch]+=error; errorMaxima[tile*3+ch]=Math.max(errorMaxima[tile*3+ch],error); maxFaceOnError=Math.max(maxFaceOnError,error);}
  }
}
for(let ch=0;ch<9;ch++)assert.ok(Math.abs(removedTotals[ch]-255*totalProfile*colors[ch])<.02,'Actual removed channel light is conserved by the analytic face-on proxy');
assert.ok(removedTotals.every(v=>v>0),'Each spiral transfers a nonzero smooth RGB component');
const result={completed:false,baselineHash,candidateHash:hash(candidate),sourceUnchanged:true,axisRatio:a.__diskAudit.diskAxisRatio(),profileSigma:Math.sqrt(momentProfile/(2*totalProfile)),verticalSigma:Math.sqrt(momentProfile/(2*totalProfile))*a.__diskAudit.diskAxisRatio(),maximumAreaGain:1/a.__diskAudit.diskAxisRatio(),diskLight:colors,removedTotals,maxFaceOnByteError:maxFaceOnError,channelIntegrals:{preTotals,postTotals,reconstructionTotals:postTotals.map((v,i)=>v+(i<9?255*totalProfile*colors[i]:0)),meanAbsoluteByteError:errorSums.map(v=>v/(512*512)),maxAbsoluteByteError:errorMaxima},globalIntegrals:{pre:preTotals.reduce((a,b)=>a+b,0),post:postTotals.reduce((a,b)=>a+b,0),reconstruction:postTotals.reduce((a,b)=>a+b,0)+255*totalProfile*colors.reduce((a,b)=>a+b,0)},regions:{},poses:[],limits:['This is an exterior orthographic emission approximation with a close-observer fade.','Brightness normalization conserves integrated display RGB, not calibrated optical power.','The smooth source is redistributed after integer atlas quantization; per-pixel face-on equality is approximate.']};
for(const name of ['neighborhood','galaxy','cosmic']){
  const ar=a.__diskAudit.makeRegion(name),br=b.__diskAudit.makeRegion(name);
  assert.deepEqual(binary(ar.points),binary(br.points),name+' exact point bytes');
  assert.equal(JSON.stringify(ar.galaxies),JSON.stringify(br.galaxies),name+' exact model data');
  assert.equal(JSON.stringify(a.UniverseFlight.landmarks(name)),JSON.stringify(b.UniverseFlight.landmarks(name)),name+' landmarks');
  const ag=a.__diskAudit.galaxyGeometry(ar.galaxies),bg=b.__diskAudit.galaxyGeometry(br.galaxies);
  assert.deepEqual(binary(ag.points.subarray(0,bg.points.length)),binary(bg.points),name+' preexisting geometry prefix');
  assert.equal(ag.disks.length,ar.galaxies.filter(m=>!m.elliptical).length,name+' one disk presentation range per spiral');
  result.regions[name]={pointCount:ar.points.length/9,pointHash:hash(binary(ar.points)),existingGeometryPrefix:hash(binary(bg.points)),models:ar.galaxies.length,ellipticalRanges:ag.ellipticals.length,bulgeRanges:ag.bulges.length,diskRanges:ag.disks.length,extraVertices:(ag.points.length-bg.points.length)/6};
  for(const model of ar.galaxies.filter(m=>!m.elliptical)) {
    const ct=Math.cos(model.tilt),st=Math.sin(model.tilt),cr=Math.cos(model.turn),sr=Math.sin(model.turn);
    for(const degrees of [0,1,2,5,10,20,45,90]){
      const theta=degrees*Math.PI/180,d=[Math.cos(theta),Math.sin(theta),0];
      const y=d[1]*ct-d[2]*st,z=d[1]*st+d[2]*ct,world=[d[0]*cr-y*sr,d[0]*sr+y*cr,z];
      const observer=model.center.map((value,i)=>value+world[i]*model.radius*3),shape=a.__diskAudit.spiralDiskView(model,observer);
      const area=Math.hypot(...shape.major)*Math.hypot(...shape.minor)/(model.radius*model.radius);
      assert.ok(Number.isFinite(shape.gain)&&shape.gain>=1-1e-8&&shape.gain<=result.maximumAreaGain+1e-8,'Exterior gain is finite and bounded');
      assert.ok(Math.abs(area*shape.gain-1)<1e-7,'Projected area and gain conserve integrated exterior light');
      result.poses.push({region:name,style:model.style,degrees,area,gain:shape.gain});
    }
    for(const range of [0,0.1,0.6,1,1.5,2]){
      const observer=model.center.map((value,i)=>value+[cr,sr,0][i]*model.radius*range),shape=a.__diskAudit.spiralDiskView(model,observer);
      assert.ok(Number.isFinite(shape.gain)&&shape.gain>=0&&shape.gain<=result.maximumAreaGain+1e-8,'Close-observer fade is finite');
      if(range<=.6)assert.equal(shape.gain,0,'Proxy fades out inside the disk');
    }
  }
}
for(const id of Object.keys(a.__diskAudit.routes)){
  assert.equal(a.__diskAudit.routes[id].atTime.toString(),b.__diskAudit.routes[id].atTime.toString(),id+' exact authored route');
}
assert.equal(hash(fs.readFileSync(sourcePath)),baselineHash,'Canonical source is still frozen after audit');
result.completed=true;fs.writeFileSync(path.join(stage,'candidate-math-audit.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({mathReady:true,axisRatio:result.axisRatio,maximumAreaGain:result.maximumAreaGain,verticalSigma:result.verticalSigma,maxFaceOnByteError:result.maxFaceOnByteError,removedTotals,regions:result.regions}));
