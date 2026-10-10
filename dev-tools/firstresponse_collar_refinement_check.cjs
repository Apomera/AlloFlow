const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const args=process.argv.slice(2),flag=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:path.resolve(args[i+1]);};
const repo=flag('--repo',path.resolve(__dirname,'..')),work=flag('--output',path.join(repo,'reports/firstresponse-collar-refinement')),mode=args[0]||'full';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const candidatePath=flag('--candidate',path.join(repo,'stem_lab/stem_tool_firstresponse.js')),beforePath=flag('--before',null);
const helperPath=flag('--helper',path.join(repo,'tests/helpers/firstresponse_collar_mesh_checks.cjs'));
const deltaPath=path.join(repo,'tests/helpers/firstresponse_collar_refinement_delta.cjs');
const rawCurrentSource=fs.readFileSync(candidatePath,'utf8');
// Keep this historical collar comparison exact; the face audit checks current eye surfaces.
const faceDeltaPath=path.join(repo,'tests/helpers/firstresponse_face_refinement_delta.cjs');
const candidate=require(faceDeltaPath).revertFaceRefinement(rawCurrentSource),before=beforePath?fs.readFileSync(beforePath,'utf8'):require(deltaPath).revertCollarRefinement(candidate);
assert.equal(sha(before),'38f468c92a949621adcf6eea4765c8a3aaf2626d35132996df1d17239b97a542');
assert.equal(sha(candidate),'0cc79f45f9a57ce3c4f1d5fa674b56f462a2418c4b253dbc648557b37a6b2639');
const inputFiles=[__filename,helperPath,candidatePath,faceDeltaPath,faceDeltaPath.replace(/\.cjs$/,'.json'),...(beforePath?[beforePath]:[deltaPath,deltaPath.replace(/\.cjs$/,'.json')]),path.join(repo,'tests/helpers/firstresponse_neck_mesh_checks.cjs')];
const inputHashes=Object.fromEntries(inputFiles.map(file=>[file,sha(fs.readFileSync(file))]));
const THREE={};new Function('exports','module',fs.readFileSync(path.join(repo,'vendor/three-r128/three.min.js'),'utf8'))(THREE,{exports:THREE});
let assertions=0;function check(value,message){assertions++;assert.ok(value,message);}function equal(a,b,message){assertions++;assert.deepEqual(a,b,message);}
const neck=require(path.join(repo,'tests/helpers/firstresponse_neck_mesh_checks.cjs')).createNeckMeshChecks(THREE,check,equal);
const collar=require(helperPath).createCollarMeshChecks(THREE,check,equal);
global.window={};function capture(source){let config;window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(value){config=value;return{attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}};new Function(source)();return config;}
const oldConfig=capture(before),newConfig=capture(candidate);
const camera=config=>JSON.parse(JSON.stringify(config,(key,value)=>key==='buildScene'?'[buildScene]':typeof value==='function'?String(value):value));
equal(camera(newConfig),camera(oldConfig),'viewer cameras, parts and metadata retain their accepted values');
function material(m){const out={};for(const key of ['type','name','transparent','opacity','depthTest','depthWrite','side','shininess','wireframe','vertexColors','flatShading','alphaTest','blending','blendSrc','blendDst','blendEquation','premultipliedAlpha','dithering','toneMapped','fog','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','linewidth','dashSize','gapSize','scale'])if(m[key]!==undefined)out[key]=m[key];for(const key of ['color','specular','emissive'])if(m[key])out[key]=m[key].toArray();out.userData=m.userData;out.onBeforeCompile=String(m.onBeforeCompile);out.customProgramCacheKey=m.customProgramCacheKey();return out;}
function fingerprint(model){const hash=crypto.createHash('sha256'),geos=new Map(),mats=new Map();let nodes=0,meshes=0;const identity=(map,obj)=>{if(!map.has(obj))map.set(obj,map.size);return map.get(obj);};
  function visit(o,p){if(o.name==='fr-manikin-torso')return;nodes++;if(o.isMesh)meshes++;
    hash.update(JSON.stringify([p,o.type,o.name,o.visible,o.matrix.toArray(),o.matrixWorld.toArray(),o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask,o.userData]));
    if(o.geometry){const g=o.geometry;hash.update(JSON.stringify([identity(geos,g),g.type,g.drawRange,g.groups]));for(const key of Object.keys(g.attributes).sort()){const a=g.attributes[key],b=a.array;hash.update(JSON.stringify([key,a.itemSize,a.normalized,b.constructor.name]));hash.update(Buffer.from(b.buffer,b.byteOffset,b.byteLength));}if(g.index){const b=g.index.array;hash.update(b.constructor.name);hash.update(Buffer.from(b.buffer,b.byteOffset,b.byteLength));}}
    if(o.material)hash.update(JSON.stringify((Array.isArray(o.material)?o.material:[o.material]).map(m=>[identity(mats,m),material(m)])));o.children.forEach((child,i)=>visit(child,p+'.'+i));
  }visit(model.scene,'scene');hash.update(JSON.stringify({meshKeys:Object.keys(model.content.meshes).sort(),picks:model.content.picks.map(o=>o.name),inspection:Object.fromEntries(Object.entries(model.content.meshes).filter(([,o])=>o.userData?.inspection).map(([key,o])=>[key,o.userData.inspection]))}));
  hash.update(JSON.stringify(model.allocatedMaterials.map(m=>[identity(mats,m),material(m)])));
  return{SHA256:hash.digest('hex'),nodes,meshes,geometries:geos.size,materials:mats.size,allocatedGeometries:model.allocatedGeometries.length,allocatedMaterials:model.allocatedMaterials.length};
}
function selftest(oldModel,newModel,settings){
  const oldTorso=oldModel.scene.getObjectByName('fr-manikin-torso'),newTorso=newModel.scene.getObjectByName('fr-manikin-torso');let sparseError;
  try{collar.density(oldTorso);}catch(error){sparseError=error.message;}check(!!sparseError&&sparseError.includes('chord error'),'accepted sparse baseline must fail the new silhouette approximation gate');
  const original=newTorso.geometry.index,bytes=Array.from(original.array);let topologyError;
  try{newTorso.geometry.setIndex(bytes.slice(3));collar.topology(newTorso);}catch(error){topologyError=error.message;}finally{newTorso.geometry.setIndex(original);}
  check(!!topologyError&&topologyError.includes('closed shell'),'removing one torso triangle must fail the topology gate');
  check(newTorso.geometry.index===original,'mutation restores exact index object');equal(Array.from(newTorso.geometry.index.array),bytes,'mutation restore re-read matches the saved index bytes');
  const restored=collar.topology(newTorso);collar.density(newTorso);
  const baselineCovered=collar.coveredSide(oldModel,settings,false);let penetrationError;try{collar.coveredSide(oldModel,settings);}catch(error){penetrationError=error.message;}
  check(!!penetrationError&&penetrationError.includes('covered neck sides'),'the accepted shallow opening must fail the new neck-side burial gate');
  return{sparseBaselineRejected:sparseError,missingTriangleRejected:topologyError,baselinePenetrationRejected:penetrationError,baselineCoveredSideOutside:baselineCovered.outside,restoredTopology:restored,restoreReadback:true,mutationScope:'private in-memory geometry only'};
}
const allCases=['adult','child','infant'].flatMap(age=>[0,5,8].map(phase=>({age,phase,contrast:false}))).concat(['adult','child','infant'].map(age=>({age,phase:8,contrast:true})));
const cases=mode==='early'||mode==='--selftest'?[{age:'adult',phase:5,contrast:false}]:allCases,results=[];let failed=false,mutation;
for(const settings of cases){const start=Date.now(),count=assertions;let a,b,result={...settings};
  try{a=neck.model(oldConfig,settings);b=neck.model(newConfig,settings);const oldTorso=a.scene.getObjectByName('fr-manikin-torso'),torso=b.scene.getObjectByName('fr-manikin-torso');
    result.density=collar.density(torso);result.topology=collar.topology(torso);result.preservation=collar.preserveTorso(oldTorso,torso,settings);result.coveredSide=collar.coveredSide(b,settings);
    result.caps=neck.caps(b,settings);for(const cap of result.caps)check(cap.outside===0,`${settings.age} pose${settings.phase} ${cap.end} actual cap burial`);
    result.neckShell=neck.shell(b);result.sleeves=collar.sleeves(b);
    const oldFingerprint=fingerprint(a);equal(fingerprint(b),oldFingerprint,'all buffers/transforms/materials/metadata outside torso remain exact');result.outsideTorso=oldFingerprint;
    equal(torso.matrix.toArray(),oldTorso.matrix.toArray(),'torso local transform unchanged');equal(torso.matrixWorld.toArray(),oldTorso.matrixWorld.toArray(),'torso world transform unchanged');equal(material(torso.material),material(oldTorso.material),'torso finish unchanged');
    collar.stable(b);equal(fingerprint(b),oldFingerprint,'outside-torso geometry and metadata remain exact across repeated frames');
    if(!mutation)mutation=selftest(a,b,settings);result.status='passed';
  }catch(error){failed=true;result.status='failed';result.error=error.stack;}finally{if(b)result.resources=neck.disposeOnce(b);if(a){const old=neck.disposeOnce(a);if(result.resources)equal(result.resources,old,'unique resource counts remain unchanged');}}
  result.assertions=assertions-count;result.durationMs=Date.now()-start;results.push(result);console.log(JSON.stringify({age:settings.age,phase:settings.phase,contrast:settings.contrast,status:result.status,density:result.density,caps:result.caps?.map(c=>({end:c.end,outside:c.outside})),error:result.error?.split('\n')[0]}));if(failed&&mode==='early')break;
}
const rereadHashes=Object.fromEntries(inputFiles.map(file=>[file,sha(fs.readFileSync(file))]));equal(rereadHashes,inputHashes,'all source, helper and checker inputs remain unchanged after verification');
const output={mode,rawCurrentSHA256:sha(rawCurrentSource),beforeSHA256:sha(before),candidateSHA256:sha(candidate),inputHashes,assertions,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,mutation,results,inputReadbackUnchanged:true};
fs.mkdirSync(work,{recursive:true});fs.writeFileSync(path.join(work,'verification-'+mode.replace(/^--/,'')+'.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({mode,assertions,passed:output.passed,failed:output.failed,candidateSHA256:output.candidateSHA256}));if(failed)process.exitCode=1;
