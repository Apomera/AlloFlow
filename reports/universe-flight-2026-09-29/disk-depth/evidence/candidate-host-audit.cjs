'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const stage=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sourcePath=path.join(repo,'stem_lab/universe_flight_scene.js');
const baselineHash='c0cc2486b3d5edd620e5975daec3d23b8f2e995a24db151be27ac30820d058c7',expectedCandidateHash='8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const baseline=fs.readFileSync(path.join(stage,'baseline-renderer.js')),candidate=fs.readFileSync(path.join(stage,'candidate-renderer.js'),'utf8');
assert.equal(hash(baseline),baselineHash);assert.equal(hash(candidate),expectedCandidateHash);assert.equal(hash(fs.readFileSync(sourcePath)),baselineHash);
const actualAuditDriverHash=hash(fs.readFileSync(__filename));
fs.writeFileSync(path.join(stage,'host-audit-provenance.json'),JSON.stringify({completed:false,startedAtUtc:new Date().toISOString(),actualAuditDriver:__filename,actualAuditDriverHash,baselineHash,candidateHash:expectedCandidateHash,originalRunStatus:'failed exact-zero boundary assertion; see original-audit-outcome.json',candidateAndBaselineWrites:false},null,2));
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
      // Large world-coordinate subtraction can put an exact .6 R pose a few
      // floating-point ulps above the fade boundary. This tolerance is many
      // orders below one display byte and treats only numerical zero as zero.
      if(range<=.6)assert.ok(shape.gain<=1e-20,'Proxy fades out inside the disk within numerical-zero precision');
    }
  }
}
for(const id of Object.keys(a.__diskAudit.routes)){
  assert.equal(a.__diskAudit.routes[id].atTime.toString(),b.__diskAudit.routes[id].atTime.toString(),id+' exact authored route');
}
assert.equal(hash(fs.readFileSync(sourcePath)),baselineHash,'Canonical source is still frozen after audit');
result.completed=true;fs.writeFileSync(path.join(stage,'candidate-host-audit.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({mathReady:true,axisRatio:result.axisRatio,maximumAreaGain:result.maximumAreaGain,verticalSigma:result.verticalSigma,maxFaceOnByteError:result.maxFaceOnByteError,removedTotals,regions:result.regions}));

const completedProvenance=JSON.parse(fs.readFileSync(path.join(stage,'host-audit-provenance.json'),'utf8'));completedProvenance.completed=true;completedProvenance.completedAtUtc=new Date().toISOString();assert.equal(hash(fs.readFileSync(__filename)),actualAuditDriverHash);assert.equal(hash(fs.readFileSync(path.join(stage,'baseline-renderer.js'))),baselineHash);assert.equal(hash(fs.readFileSync(path.join(stage,'candidate-renderer.js'))),expectedCandidateHash);fs.writeFileSync(path.join(stage,'host-audit-provenance.json'),JSON.stringify(completedProvenance,null,2));
