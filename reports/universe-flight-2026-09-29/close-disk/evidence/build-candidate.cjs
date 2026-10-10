const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const stage=__dirname;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const input=fs.readFileSync(path.join(repo,'stem_lab/universe_flight_scene.js'));
assert.equal(hash(input),'8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9');
assert.deepEqual(input,fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/universe_flight_scene.js')));
let candidate=input.toString('utf8');
const replacements=[];
function replace(before,after){assert.equal(candidate.split(before).length,2,before);candidate=candidate.replace(before,after);replacements.push({before,after});}
const helper=`  // The authored flat spiral map is an exterior illustration. Inside its
  // luminous footprint, hand it off to the actual 3D records within 1–4
  // generated diffuse-disk height sigmas. This is not dust transfer or a
  // conserved-light model. Outside that small envelope, the marker stays zero.
  function spiralPlaneMarker(model, observer) {
    var dx=(observer[0]-model.center[0])/model.radius;
    var dy=(observer[1]-model.center[1])/model.radius;
    var dz=(observer[2]-model.center[2])/model.radius;
    var x=dx*Math.cos(model.turn)+dy*Math.sin(model.turn);
    var y=-dx*Math.sin(model.turn)+dy*Math.cos(model.turn);
    var height=Math.abs(y*Math.cos(model.tilt)+dz*Math.sin(model.tilt));
    var z=-y*Math.sin(model.tilt)+dz*Math.cos(model.tilt);
    var radial=clamp((Math.hypot(x,z)-1.12)/0.10,0,1);
    var vertical=clamp((height-0.012)/0.036,0,1);
    var interior=1-radial*radial*(3-2*radial);
    var within=1-vertical*vertical*(3-2*vertical);
    return Math.fround(0.5*interior*within);
  }
  function writeSpiralPlane(values, range, observer) {
    var marker=spiralPlaneMarker(range.model,observer);
    if (marker===range.marker) return false;
    for (var offset=range.offset+5;offset<range.offset+range.count;offset+=6) values[offset]=marker;
    range.marker=marker;
    return true;
  }
`;
replace('  function galaxyGeometry(models) {',helper+'  function galaxyGeometry(models) {');
replace('var values=[],segments=8,ellipticals=[],bulges=[],disks=[];','var values=[],segments=8,ellipticals=[],bulges=[],disks=[],planes=[];');
replace('      if(model.elliptical) ellipticals.push({model:model,offset:values.length,count:segments*segments*6*6});','      if(model.elliptical) ellipticals.push({model:model,offset:values.length,count:segments*segments*6*6});\n      else planes.push({model:model,offset:values.length,count:segments*segments*6*6,marker:0});');
replace('return {points:new Float32Array(values),ellipticals:ellipticals,bulges:bulges,disks:disks};','return {points:new Float32Array(values),ellipticals:ellipticals,bulges:bulges,disks:disks,planes:planes};');
replace('source=light*exp(-r*2.5)*edge*edge*(-v_bulge-1.0);}else{source=v_bulge>0.0?t.a*vec3(1.0,0.80,0.56)*(v_bulge-1.0):t.rgb;}', 'source=light*exp(-r*2.5)*edge*edge*(-v_bulge-1.0);}else{source=v_bulge>=1.0?t.a*vec3(1.0,0.80,0.56)*(v_bulge-1.0):(v_bulge>0.0?t.rgb*(1.0-2.0*v_bulge):t.rgb);}');
replace('      galaxyObserver=state.position.slice();',`      galaxySurfaces.planes.forEach(function(range){
        if (writeSpiralPlane(galaxySurfaces.points,range,state.position)) {
          gl.bufferSubData(gl.ARRAY_BUFFER,range.offset*4,galaxySurfaces.points.subarray(range.offset,range.offset+range.count));
        }
      });
      galaxyObserver=state.position.slice();`);
assert.equal(replacements.length,6);
let inverse=candidate;
for(const item of [...replacements].reverse()){assert.equal(inverse.split(item.after).length,2);inverse=inverse.replace(item.after,item.before);}
assert.equal(inverse,input.toString('utf8'));
fs.writeFileSync(path.join(stage,'baseline-renderer.js'),input);
fs.writeFileSync(path.join(stage,'candidate-renderer.js'),candidate);
fs.writeFileSync(path.join(stage,'patch-manifest.json'),JSON.stringify({baseline:hash(input),candidate:hash(candidate),inverseExact:true,replacements},null,2)+'\n');
console.log(JSON.stringify({baseline:hash(input),candidate:hash(candidate),inverseExact:true,replacements:replacements.length}));
